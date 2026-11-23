import type { TransactionRunner } from "../../db/transaction.js";
import type { HardwareStore } from "../../models/HardwareStore.js";
import type { Inventory } from "../../models/Inventory.js";
import type { Product } from "../../models/Product.js";
import { AppError } from "../../shared/AppError.js";
import { canAccessStore, type AuthUser } from "../../shared/auth.js";
import { fromStored, isBelowMinimum, toStored } from "../../shared/quantity.js";
import type { ProductRepository } from "../products/product.repository.js";
import type { ListProductsQuery } from "../products/product.schema.js";
import type { ReservationRepository, ReservedRow } from "../reservations/reservation.repository.js";
import type { StoreRepository } from "../stores/store.repository.js";
import type { InventoryRepository } from "./inventory.repository.js";

export class InventoryService {
    constructor(
        private readonly inventory: InventoryRepository,
        private readonly products: ProductRepository,
        private readonly stores: StoreRepository,
        private readonly db: TransactionRunner,
        private readonly reservations: ReservationRepository,
        private readonly now: () => Date = () => new Date(),
    ) {}

    async list(actor: AuthUser, query: ListProductsQuery) {
        const includeInactive = query.includeInactive && actor.role !== "employee";

        const { items: products, total } = await this.products.findAll({
            search: query.search,
            category: query.category,
            barcode: query.barcode,
            includeInactive,
            limit: query.limit,
            offset: query.offset,
        });
        const stores = await this.stores.findAll({ includeInactive: false });
        const productIds = products.map((product) => product.id);
        const rows = await this.inventory.findByProductIds(productIds);
        const reservedRows = await this.reservations.sumReservedByProducts(productIds, this.now());

        return {
            items: products.map((product) => this.buildStock(product, stores, rows, reservedRows)),
            total,
            limit: query.limit,
            offset: query.offset,
        };
    }

    async getByProduct(actor: AuthUser, productId: number) {
        const product = await this.products.findById(productId);
        if (!product || (!product.isActive && actor.role === "employee")) {
            throw new AppError(404, "Producto no encontrado");
        }

        const stores = await this.stores.findAll({ includeInactive: false });
        const rows = await this.inventory.findByProductIds([product.id]);
        const reservedRows = await this.reservations.sumReservedByProducts([product.id], this.now());

        return this.buildStock(product, stores, rows, reservedRows);
    }

    async setMinQuantity(actor: AuthUser, productId: number, storeId: number, minQuantity: number) {
        if (!canAccessStore(actor, storeId)) {
            throw new AppError(403, "No tenés acceso a ese local");
        }

        await this.db.run(async (tx) => {
            const product = await this.products.findById(productId, tx);
            if (!product) throw new AppError(404, "Producto no encontrado");

            const store = await this.stores.findById(storeId, tx);
            if (!store) throw new AppError(404, "Ferretería no encontrada");
            if (!store.isActive) throw new AppError(400, "La ferretería está desactivada");

            const stored = toStored(minQuantity, product.unit);
            await this.inventory.setMinQuantity(productId, storeId, stored, tx);
        });

        return this.getByProduct(actor, productId);
    }

    private buildStock(product: Product, stores: HardwareStore[], rows: Inventory[], reservedRows: ReservedRow[]) {
        const rowByStore = new Map(
            rows.filter((row) => row.productId === product.id).map((row => [row.hardwareStoreId, row])),
        );
        const reservedByStore = new Map(
            reservedRows
                .filter((row) => row.productId === product.id)
                .map((row) => [row.hardwareStoreId, row.reserved] as const),
        );

        return {
            product,
            stores: stores.map((store) => {
                const row = rowByStore.get(store.id);
                const quantity = row?.quantity ?? 0;
                const minQuantity = row?.minQuantity ?? 0;
                const reserved = reservedByStore.get(store.id) ?? 0;

                return {
                    storeId: store.id,
                    storeName: store.name,
                    quantity: fromStored(quantity),
                    minQuantity: fromStored(minQuantity),
                    belowMinimum: isBelowMinimum(quantity, minQuantity),
                    reserved: fromStored(reserved),
                    available: fromStored(quantity - reserved),
                };
            }),
        };
    }
}