import { col, Op, type Transaction } from "sequelize";
import { Inventory } from "../../models/Inventory.js";

export interface StockChange {
    previousQuantity: number;
    quantity: number;
    minQuantity: number;
}

export class InventoryRepository {
    async findByProductIds(productIds: number[], tx?: Transaction) {
        if (productIds.length === 0) return [];
        return Inventory.findAll({ where: { productId: productIds }, transaction: tx });
    }

    async findBelowMinimumCandidates(storeIds: number[], tx?: Transaction) {
        if (storeIds.length === 0) return [];

        return Inventory.findAll({
            where: {
                hardwareStoreId: storeIds,
                [Op.or]: [
                    { quantity: { [Op.lt]: 0 } },
                    { minQuantity: { [Op.gt]: 0 }, quantity: { [Op.lte]: col("minQuantity") } },
                ],
            },
            transaction: tx,
        });
    }

    async setMinQuantity(productId: number, hardwareStoreId: number, minQuantity: number, tx?: Transaction) {
        const row = await Inventory.findOne({ where: { productId, hardwareStoreId }, transaction: tx });

        if (row) {
            await row.update({ minQuantity }, { transaction: tx });
        } else {
            await Inventory.create({ productId, hardwareStoreId, minQuantity }, { transaction: tx });
        }
    }

    async applyDelta(productId: number, hardwareStoreId: number, delta: number, tx: Transaction) {
        const row = await this.lockRow(productId, hardwareStoreId, tx);
        return this.save(row, productId, hardwareStoreId, (row?.quantity ?? 0) + delta, tx);
    }

    async setQuantity(productId: number, hardwareStoreId: number, quantity: number, tx: Transaction) {
        const row = await this.lockRow(productId, hardwareStoreId, tx);
        return this.save(row, productId, hardwareStoreId, quantity, tx);
    }

    private lockRow(productId: number, hardwareStoreId: number, tx: Transaction) {
        return Inventory.findOne({
            where: { productId, hardwareStoreId },
            transaction: tx,
            lock: tx.LOCK.UPDATE, // Esto es para PostgreSQL cuando lo migremos (si es que lo hacemos)
        });
    }

    private async save(row: Inventory | null, productId: number, hardwareStoreId: number, quantity: number, tx: Transaction): Promise<StockChange> {
        if (!row) {
            const created = await Inventory.create({ productId, hardwareStoreId, quantity }, { transaction: tx });
            return { previousQuantity: 0, quantity: created.quantity, minQuantity: created.minQuantity };
        }

        const previousQuantity = row.quantity;
        await row.update({ quantity }, { transaction: tx });
        return { previousQuantity, quantity: row.quantity, minQuantity: row.minQuantity};
    }
}