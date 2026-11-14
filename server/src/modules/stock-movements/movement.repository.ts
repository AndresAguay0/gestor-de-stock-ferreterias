import { Op, type Transaction, type WhereOptions } from "sequelize";
import { HardwareStore } from "../../models/HardwareStore.js";
import { Product } from "../../models/Product.js";
import { StockMovement, type MovementReason, type MovementType } from "../../models/StockMovement.js";
import { User } from "../../models/User.js";

export interface NewMovementData {
    productId: number;
    hardwareStoreId: number;
    userId: number;
    type: MovementType;
    reason: MovementReason;
    quantity: number;
    resultingQuantity: number;
    note?: string;
    clientRef?: string;
}

export interface MovementFilters {
    productId?: number;
    storeId?: number;
    storeIds?: number[];
    userId?: number;
    type?: MovementType;
    reason?: MovementReason;
    from?: Date;
    to?: Date;
    limit: number;
    offset: number;
}

export class MovementRepository {
    create(data: NewMovementData, tx?: Transaction) {
        return StockMovement.create(data, { transaction: tx });
    }

    async existsByClientRef(clientRef: string, tx?: Transaction) {
        return (await StockMovement.count({ where: { clientRef }, transaction: tx })) > 0;
    }

    async findAll(filters: MovementFilters, tx?: Transaction) {
        if (filters.storeIds && filters.storeIds.length === 0) {
            return { items: [] as StockMovement[], total: 0 };
        }

        const conditions: WhereOptions[] = [];
        if (filters.productId !== undefined) conditions.push({ productId: filters.productId });
        if (filters.storeId !== undefined) conditions.push({ hardwareStoreId: filters.storeId });
        if (filters.storeIds) conditions.push({ hardwareStoreId: filters.storeIds });
        if (filters.userId !== undefined) conditions.push({ userId: filters.userId });
        if (filters.type) conditions.push({ type: filters.type });
        if (filters.reason) conditions.push({ reason: filters.reason });
        if (filters.from) conditions.push({ createdAt: { [Op.gte]: filters.from } });
        if (filters.to) conditions.push({ createdAt: { [Op.lt]: filters.to } }); 

        const { rows, count } = await StockMovement.findAndCountAll({
            where: { [Op.and]: conditions },
            include: [
                { model: Product, as: "product", attributes: ["id", "name", "unit"] },
                { model: HardwareStore, as: "store", attributes: ["id", "name"] },
                { model: User, as: "user", attributes: ["id", "email"] },
            ],
            order: [
                ["createdAt", "DESC"],
                ["id", "DESC"],
            ],
            limit: filters.limit,
            offset: filters.offset,
            transaction: tx,
        });

        return { items: rows, total: count};
    }
}