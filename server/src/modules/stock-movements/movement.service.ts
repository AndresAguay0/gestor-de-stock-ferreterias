import type { TransactionRunner } from "../../db/transaction.js";
import type { StockMovement } from "../../models/StockMovement.js";
import { AppError } from "../../shared/AppError.js";
import { canAccessStore, type AuthUser } from "../../shared/auth.js";
import { fromStored, isBelowMinimum, toStored } from "../../shared/quantity.js";
import type { InventoryRepository } from "../inventory/inventory.repository.js";
import type { ProductRepository } from "../products/product.repository.js";
import type { StoreRepository } from "../stores/store.repository.js";
import type { MovementRepository } from "./movement.repository.js";
import type { CreateMovementInput, ListMovementsQuery } from "./movement.schema.js";

export class MovementService {
    constructor(
        private readonly movements: MovementRepository,
        private readonly inventory: InventoryRepository,
        private readonly products: ProductRepository,
        private readonly stores: StoreRepository,
        private readonly db: TransactionRunner,
    ) {}

    async register(actor: AuthUser, input: CreateMovementInput) {
        if (input.type === "adjustment" && actor.role === "employee") {
            throw new AppError(403, "Solo los gerentes y el dueño pueden hacer ajustes de stock");
        }
        if (!canAccessStore(actor, input.storeId)) {
            throw new AppError(403, "No tenés acceso a ese local");
        }

        return this.db.runExclusive(async (tx) => {
            const product = await this.products.findById(input.productId, tx);

            if (!product || (!product.isActive && actor.role === "employee")) {
                throw new AppError(404, "Producto no encontrado");
            }
            if (!product.isActive) throw new AppError(400, "El producto está dado de baja");

            const store = await this.stores.findById(input.storeId, tx);
            if (!store) throw new AppError(404, "Ferretería no encontrada");
            if (!store.isActive) throw new AppError(400, "La ferretería está desactivada");

            if (input.clientRef !== undefined && (await this.movements.existsByClientRef(input.clientRef, tx))) {
                throw new AppError(409, "Ya se registró un movimiento con esa referencia");
            }

            const amount = toStored(
                input.type === "adjustment" ? input.countedQuantity : input.quantity,
                product.unit,
            );

            const change = input.type === "adjustment"
                ? await this.inventory.setQuantity(product.id, store.id, amount, tx)
                : await this.inventory.applyDelta(product.id, store.id, input.type === "in" ? amount : -amount, tx);
            
            const movement = await this.movements.create(
                {
                    productId: product.id,
                    hardwareStoreId: store.id,
                    userId: actor.id,
                    type: input.type,
                    reason: input.reason,
                    quantity: change.quantity - change.previousQuantity,
                    resultingQuantity: change.quantity,
                    note: input.note,
                    clientRef: input.clientRef,
                }, tx,
            );

            return {
                movement: this.view(movement), stock: {
                    productId: product.id,
                    storeId: store.id,
                    storeName: store.name,
                    quantity: fromStored(change.quantity),
                    minQuantity: fromStored(change.minQuantity),
                    belowMinimum: isBelowMinimum(change.quantity, change.minQuantity),
                    negativeStock: change.quantity < 0,
                },
            };
        });
    }

    async list(actor: AuthUser, query: ListMovementsQuery) {
        if (actor.role === "employee") {
            throw new AppError(403, "No tenés permiso para realizar esta acción");
        }
        if (query.storeId !== undefined && !canAccessStore(actor, query.storeId)) {
            throw new AppError(403, "No tenés acceso a ese local");
        }

        const { items, total } = await this.movements.findAll({
            ...query,
            storeIds: actor.role === "owner" ? undefined : actor.storeIds,
        });

        return {
            items: items.map((movement) => ({
                ...this.view(movement),
                product: movement.product
                    ? { id: movement.product.id, name: movement.product.name, unit: movement.product.unit }
                    : null,
                store: movement.store ? { id: movement.store.id, name: movement.store.name} : null,
                user: movement.user ? { id: movement.user.id, email: movement.user.email } : null, 
            })),
            total,
            limit: query.limit,
            offset: query.offset,
        };
    }

    private view(movement: StockMovement) {
        return {
            id: movement.id,
            productId: movement.productId,
            storeId: movement.hardwareStoreId,
            userId: movement.userId,
            type: movement.type,
            reason: movement.reason,
            quantity: fromStored(movement.quantity),
            resultingQuantity: fromStored(movement.resultingQuantity),
            note: movement.note ?? null,
            clientRef: movement.clientRef ?? null,
            createdAt: movement.createdAt,
        };
    }
}