import type { Transaction } from "sequelize";
import { HardwareStore } from "../../models/HardwareStore.js";
import type { CreateStoreInput, UpdateStoreInput } from "./store.schema.js";

export class StoreRepository {
    findAll(options: { includeInactive: boolean}, tx?: Transaction) {
        return HardwareStore.findAll({
            where: options.includeInactive ? {} : { isActive: true },
            order: [["name", "ASC"]],
            transaction: tx,
        });
    }
    
    findById(id: number, tx?: Transaction) {
        return HardwareStore.findByPk(id, { transaction: tx });
    }

    create(data: CreateStoreInput, tx?: Transaction) {
        return HardwareStore.create(data, { transaction: tx });
    }

    async update(id: number, data: UpdateStoreInput, tx?: Transaction) {
        const store = await HardwareStore.findByPk(id, { transaction: tx });
        if (!store) return null;
        return store.update(data, { transaction: tx });
    }
}