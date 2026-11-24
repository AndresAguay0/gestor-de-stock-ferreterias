import type { Transaction } from "sequelize";
import type { TransactionRunner } from "../../db/transaction.js";
import type { Reservation, ReservationState } from "../../models/Reservation.js";
import { AppError } from "../../shared/AppError.js";
import { canAccessStore, type AuthUser } from "../../shared/auth.js";
import type { EventBus } from "../../shared/events.js";
import { fromStored, toStored } from "../../shared/quantity.js";
import type { InventoryRepository } from "../inventory/inventory.repository.js";
import type { ProductRepository } from "../products/product.repository.js";
import type { SettingsRepository } from "../settings/settings.repository.js";
import type { MovementService } from "../stock-movements/movement.service.js";
import type { StoreRepository } from "../stores/store.repository.js";
import type { ReservationRepository } from "./reservation.repository.js";
import type { CreateReservationInput, ListReservationsQuery } from "./reservation.schema.js";

export class ReservationService {
    constructor(
        private readonly reservations: ReservationRepository,
        private readonly products: ProductRepository,
        private readonly stores: StoreRepository,
        private readonly inventory: InventoryRepository,
        private readonly settings: SettingsRepository,
        private readonly movements: MovementService,
        private readonly db: TransactionRunner,
        private readonly events: EventBus,
        private readonly now: () => Date = () => new Date(),
    ) {}

    async create(actor: AuthUser, input: CreateReservationInput) {
        if (input.originStoreId !== undefined && !canAccessStore(actor, input.originStoreId)) {
            throw new AppError(403, "No tenés acceso al local de origen");
        }

        const now = this.now();

        const id = await this.db.runExclusive(async (tx) => {
            const product = await this.products.findById(input.productId, tx);
            if (!product || (!product.isActive && actor.role === "employee")) {
                throw new AppError(404, "Producto no encontrado");
            }
            if (!product.isActive) throw new AppError(400, "El producto está dado de baja");

            const store = await this.stores.findById(input.storeId, tx);
            if (!store) throw new AppError(404, "Ferretería no encontrada");
            if (!store.isActive) throw new AppError(400, "La ferretería está desactivada");

            if (input.originStoreId !== undefined) {
                const origin = await this.stores.findById(input.originStoreId, tx);
                if (!origin) throw new AppError(404, "Ferretería de origen no encontrada");
                if (!origin.isActive) throw new AppError(400, "La ferretería de origen está desactivada");
            }

            const quantity = toStored(input.quantity, product.unit);

            // Calculo del stock disponible descontando las cantidades ya reservadas
            const rows = await this.inventory.findByProductIds([product.id], tx);
            const stock = rows.find((row) => row.hardwareStoreId === store.id)?.quantity ?? 0;
            const reserved = await this.reservations.sumReserved(product.id, store.id, now, tx);
            const available = stock - reserved;
            if (quantity > available) {
                throw new AppError(
                    409,
                    `No hay stock disponible suficiente: se pueden reservar ${fromStored(Math.max(available, 0))}`,
                );
            }

            const minutes = input.minutes ?? (await this.settings.get(tx)).reservationDefaultMinutes;

            const created = await this.reservations.create(
                {
                    productId: product.id,
                    hardwareStoreId: store.id,
                    originStoreId: input.originStoreId,
                    quantity,
                    createdByUserId: actor.id,
                    customerNote: input.customerNote,
                    expiresAt: new Date(now.getTime() + minutes * 60_000),
                },
                tx,
            );

            return created.id;
        });

        return this.view(await this.loadVisible(actor, id), now);
    }

    async list(actor: AuthUser, query: ListReservationsQuery) {
        const now = this.now();

        const { items, total } = await this.reservations.findAll(
            {
                status: query.status,
                storeId: query.storeId,
                productId: query.productId,
                scope: actor.role === "owner" ? undefined : { userId: actor.id, storeIds: actor.storeIds },
                limit: query.limit,
                offset: query.offset,
            },
            now,
        );

        return {
            items: items.map((reservation) => this.view(reservation, now)),
            total,
            limit: query.limit,
            offset: query.offset,
        };
    }

    async getById(actor: AuthUser, id: number) {
        const now = this.now();
        return this.view(await this.loadVisible(actor, id), now);
    }

    // Confirma el retiro de una reserva y descuenta el stock
    async pickup(actor: AuthUser, id: number) {
        const now = this.now();

        const { event, result, reservation } = await this.db.runExclusive(async (tx) => {
            const current = await this.loadVisible(actor, id, tx);

            if (!canAccessStore(actor, current.hardwareStoreId)) {
                throw new AppError(403, "No tenés acceso al local donde está el stock reservado");
            }
            this.assertActive(current);
            if (current.expiresAt.getTime() <= now.getTime()) {
                throw new AppError(409, "La reserva venció");
            }

            // Marca la reserva como retirada
            await this.reservations.resolve(current.id, "picked_up", actor.id, now, tx);

            const applied = await this.movements.applyMovement(
                actor,
                {
                    type: "out",
                    reason: "sale",
                    productId: current.productId,
                    storeId: current.hardwareStoreId,
                    quantity: fromStored(current.quantity),
                    note: `Retiro de la reserva #${current.id}`,
                },
                tx,
            );

            // Vincula el movimiento con la reserva
            await this.reservations.setMovementId(current.id, applied.result.movement.id, tx);

            return {
                event: applied.event,
                result: applied.result,
                reservation: await this.loadVisible(actor, current.id, tx),
            };
        });

        this.events.emit("stock.changed", event);

        return { reservation: this.view(reservation, now), movement: result.movement, stock: result.stock };
    }

    async cancel(actor: AuthUser, id: number) {
        const now = this.now();

        await this.db.runExclusive(async (tx) => {
            const current = await this.loadVisible(actor, id, tx);

            if (current.createdByUserId !== actor.id && !canAccessStore(actor, current.hardwareStoreId)) {
                throw new AppError(403, "No tenés permiso para cancelar esta reserva");
            }

            // Evita cancelar una reserva ya cancelada o retirada
            this.assertActive(current);

            await this.reservations.resolve(current.id, "cancelled", actor.id, now, tx);
        });

        return this.view(await this.loadVisible(actor, id), now);
    }

    private canView(actor: AuthUser, reservation: Reservation) {
        return (
            reservation.createdByUserId === actor.id ||
            canAccessStore(actor, reservation.hardwareStoreId) ||
            (reservation.originStoreId != null && canAccessStore(actor, reservation.originStoreId))
        );
    }

    private async loadVisible(actor: AuthUser, id: number, tx?: Transaction) {
        const reservation = await this.reservations.findById(id, tx);
        if (!reservation || !this.canView(actor, reservation)) {
            throw new AppError(404, "Reserva no encontrada");
        }
        return reservation;
    }

    private assertActive(reservation: Reservation) {
        if (reservation.status === "picked_up") throw new AppError(409, "La reserva ya fue retirada");
        if (reservation.status === "cancelled") throw new AppError(409, "La reserva ya fue cancelada");
    }

    private view(reservation: Reservation, now: Date) {
        const status: ReservationState =
            reservation.status === "active" && reservation.expiresAt.getTime() <= now.getTime()
                ? "expired"
                : reservation.status;

        return {
            id: reservation.id,
            productId: reservation.productId,
            storeId: reservation.hardwareStoreId,
            originStoreId: reservation.originStoreId ?? null,
            quantity: fromStored(reservation.quantity),
            status,
            customerNote: reservation.customerNote ?? null,
            createdByUserId: reservation.createdByUserId,
            expiresAt: reservation.expiresAt,
            resolvedAt: reservation.resolvedAt ?? null,
            resolvedByUserId: reservation.resolvedByUserId ?? null,
            movementId: reservation.movementId ?? null,
            createdAt: reservation.createdAt,
            product: reservation.product
                ? { id: reservation.product.id, name: reservation.product.name, unit: reservation.product.unit }
                : null,
            store: reservation.store ? { id: reservation.store.id, name: reservation.store.name } : null,
            originStore: reservation.originStore
                ? { id: reservation.originStore.id, name: reservation.originStore.name }
                : null,
            createdBy: reservation.createdBy
                ? { id: reservation.createdBy.id, email: reservation.createdBy.email }
                : null,
            resolvedBy: reservation.resolvedBy
                ? { id: reservation.resolvedBy.id, email: reservation.resolvedBy.email }
                : null,
        };
    }
}