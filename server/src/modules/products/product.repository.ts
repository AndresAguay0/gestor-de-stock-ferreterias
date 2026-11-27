import { Op, type Transaction, type WhereOptions } from "sequelize";
import { Product } from "../../models/Product.js";
import type { CreateProductInput } from "./product.schema.js";

export interface ProductFilters {
    search?: string;
    category?: string;
    barcode?: string;
    ids?: number[];
    includeInactive: boolean;
    limit: number;
    offset: number;
}

export interface ProductChanges {
    name?: string;
    description?: string | null;
    category?: string;
    priceCents?: number;
    sku?: string | null;
    barcode?: string | null;
    isActive?: boolean;
}

export class ProductRepository {
    async findAll(filters: ProductFilters, tx?: Transaction) {

        if (filters.ids && filters.ids.length === 0) {
            return { items: [] as Product[], total: 0 };
        }

        const conditions: WhereOptions[] = [];

        if (!filters.includeInactive) conditions.push({ isActive: true });
        if (filters.category) conditions.push({ category: filters.category });
        if (filters.barcode) conditions.push({ barcode: filters.barcode });
        if (filters.ids) conditions.push({ id: filters.ids });

        if (filters.search) {
            for (const word of filters.search.split(/\s+/)) {
                const like = `%${word}%`;
                conditions.push({
                    [Op.or]: [
                        { name: { [Op.like]: like } },
                        { description: { [Op.like]: like } },
                        { sku: { [Op.like]: like } },
                        { barcode: { [Op.like]: like } },
                    ],
                });
            }
        }

        const { rows, count } = await Product.findAndCountAll({
            where: { [Op.and]: conditions },
            order: [["name", "ASC"], ["id", "ASC"],],
            limit: filters.limit,
            offset: filters.offset,
            transaction: tx,
        });

        return { items: rows, total: count };
    }

    findById(id: number, tx?: Transaction) {
        return Product.findByPk(id, { transaction: tx });
    }

    create(data: CreateProductInput, tx?: Transaction) {
        return Product.create(data, { transaction: tx });
    }

    async update(id: number, changes: ProductChanges, tx?: Transaction) {
        const product = await Product.findByPk(id, { transaction: tx });
        if (!product) return null;
        return product.update(changes, { transaction: tx });
    }

    async existsBySku(sku: string, excludeId?: number, tx?: Transaction) {
        const where: WhereOptions = excludeId === undefined ? { sku } : { sku, id: { [Op.ne]: excludeId } };
        return (await Product.count({ where, transaction: tx })) > 0;
    }

    async existsByBarcode(barcode: string, excludeId?: number, tx?: Transaction) {
        const where: WhereOptions = excludeId === undefined ? { barcode } : { barcode, id: { [Op.ne]: excludeId } };
        return (await Product.count({ where, transaction: tx })) > 0;
    }
}