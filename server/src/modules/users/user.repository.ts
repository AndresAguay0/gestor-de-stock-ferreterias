import type { Includeable, Transaction } from "sequelize";
import { HardwareStore } from "../../models/HardwareStore.js";
import { User, type UserRole } from "../../models/User.js";
import { UserStore } from "../../models/UserStore.js";

const includeStores: Includeable = {
    model: HardwareStore,
    as: "stores",
    through: { attributes: [] },
};

export interface NewUserData {
    email: string;
    passwordHash: string;
    role: UserRole;
}

export interface UserChanges {
    email?: string;
    role?: UserRole;
    isActive?: boolean;
}

export class UserRepository {
    findAll(options: { includeInactive: boolean }, tx?: Transaction) {
        return User.findAll({
            where: options.includeInactive ? {} : { isActive: true },
            include: [includeStores],
            order: [["email", "ASC"]],
            transaction: tx,
        });
    }

    findById(id: number, tx?: Transaction) {
        return User.findByPk(id, { include: [includeStores], transaction: tx });
    }

    findByEmailWithPassword(email: string, tx?: Transaction) {
        return User.scope("withPassword").findOne({ where: { email }, transaction: tx });
    }

    create(data: NewUserData, tx?: Transaction) {
        return User.create(data, { transaction: tx });
    }

    async update(id: number, changes: UserChanges, tx?: Transaction) {
        const user = await User.findByPk(id, { transaction: tx });
        if (!user) return null;
        return user.update(changes, { transaction: tx });
    }

    async replaceStores(userId: number, storeIds: number[], tx?: Transaction) {
        await UserStore.destroy({ where: { userId }, transaction: tx });
        await UserStore.bulkCreate(
            storeIds.map((hardwareStoreId) => ({ userId, hardwareStoreId })), { transaction: tx },
        );
    }
}