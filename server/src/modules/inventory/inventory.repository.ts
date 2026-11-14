import type { Transaction } from "sequelize";
import { Inventory } from "../../models/Inventory.js";

export class InventoryRepository {
    async findByProductIds(productIds: number[], tx?: Transaction) {
        if (productIds.length === 0) return [];
        return Inventory.findAll({ where: { productId: productIds }, transaction: tx });
    }

    async setMinQuantity(productId: number, hardwareStoreId: number, minQuantity: number, tx?: Transaction) {
        const row = await Inventory.findOne({ where: { productId, hardwareStoreId }, transaction: tx });

        if (row) {
            await row.update({ minQuantity }, { transaction: tx });
        } else {
            await Inventory.create({ productId, hardwareStoreId, minQuantity }, { transaction: tx });
        }
    }
}