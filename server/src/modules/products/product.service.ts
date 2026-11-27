import type { Transaction } from "sequelize";
import type { TransactionRunner } from "../../db/transaction.js";
import { AppError } from "../../shared/AppError.js";
import type { AuthUser } from "../../shared/auth.js";
import type { ProductChanges, ProductRepository } from "./product.repository.js";
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from "./product.schema.js";

export class ProductService {
    constructor(
        private readonly products: ProductRepository,
        private readonly db: TransactionRunner,
    ) {}

    async list(actor: AuthUser, query: ListProductsQuery) {
        const includeInactive = query.includeInactive && actor.role !== "employee";

        const { items, total } = await this.products.findAll({
            search: query.search,
            category: query.category,
            barcode: query.barcode,
            includeInactive,
            limit: query.limit,
            offset: query.offset,
        });

        return { items, total, limit: query.limit, offset: query.offset };
    }

    async getById(actor: AuthUser, id: number) {
        const product = await this.findOrFail(id);
        if (!product.isActive && actor.role === "employee") {
            throw new AppError(404, "Producto no encontrado");
        }
        return product;
    }

    create(input: CreateProductInput) {
        return this.db.run(async (tx) => {
            if (input.sku !== undefined) await this.assertSkuAvailable(input.sku, undefined, tx);
            if (input.barcode !== undefined) await this.assertBarcodeAvailable(input.barcode, undefined, tx);

            return this.products.create(input, tx);
        });
    }

    update(id: number, input: UpdateProductInput) {
        return this.db.run(async (tx) => {
            await this.findOrFail(id, tx);

            if (input.sku) await this.assertSkuAvailable(input.sku, id, tx);
            if (input.barcode) await this.assertBarcodeAvailable(input.barcode, id, tx);

            const changes: ProductChanges = {};
            if (input.name !== undefined) changes.name = input.name;
            if (input.description !== undefined) changes.description = input.description;
            if (input.category !== undefined) changes.category = input.category;
            if (input.priceCents !== undefined) changes.priceCents = input.priceCents;
            if (input.sku !== undefined) changes.sku = input.sku;
            if (input.barcode !== undefined) changes.barcode = input.barcode;
            if (input.isActive !== undefined) changes.isActive = input.isActive;

            const product = await this.products.update(id, changes, tx);
            if (!product) throw new AppError(404, "Producto no encontrado");
            return product;
        });
    }

    private async findOrFail(id: number, tx?: Transaction) {
        const product = await this.products.findById(id, tx);
        if (!product) throw new AppError(404, "Producto no encontrado");;
        return product;
    }

    private async assertSkuAvailable(sku: string, excludeId: number | undefined, tx: Transaction ) {
        if (await this.products.existsBySku(sku, excludeId, tx)) {
            throw new AppError(409, "Ya existe un producto con ese SKU");
        }
    }

    private async assertBarcodeAvailable(barcode: string, excludeId: number | undefined, tx: Transaction) {
        if (await this.products.existsByBarcode(barcode, excludeId, tx)) {
            throw new AppError(409, "Ya existe un producto con ese código de barras");
        }
    }
}