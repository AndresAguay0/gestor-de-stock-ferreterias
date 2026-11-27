import type { Includeable, Transaction, WhereOptions } from "sequelize";
import { HardwareStore } from "../../models/HardwareStore.js";
import { Notification, type NotificationType } from "../../models/Notification.js";
import { Product } from "../../models/Product.js";

export interface NewNotificationData {
    userId: number;
    type: NotificationType;
    productId: number;
    hardwareStoreId: number;
    quantity: number;
    minQuantity: number;
}

export interface NotificationFilters {
    unread?: boolean;
    limit: number;
    offset: number;
}

const INCLUDES: Includeable[] = [
    { model: Product, as: "product", attributes: ["id", "name", "unit"] },
    { model: HardwareStore, as: "store", attributes: ["id", "name"] },
];

export class NotificationRepository {
    async createMany(data: NewNotificationData[], tx: Transaction) {
        const created: Notification[] = [];
        for (const item of data) {
            created.push(await Notification.create(item, { transaction: tx }));
        }
        return created;
    }

    async findAllForUser(userId: number, filters: NotificationFilters, tx?: Transaction) {
        const where: WhereOptions = filters.unread ? { userId, readAt: null } : { userId };

        const { rows, count } = await Notification.findAndCountAll({
            where,
            include: INCLUDES,
            order: [
                ["createdAt", "DESC"],
                ["id", "DESC"],
            ],
            limit: filters.limit,
            offset: filters.offset,
            transaction: tx,
        });

        return { items: rows, total: count };
    }

    countUnread(userId: number, tx?: Transaction) {
        return Notification.count({ where: { userId, readAt: null }, transaction: tx });
    }

    findOwned(id: number, userId: number, tx?: Transaction) {
        return Notification.findOne({ where: { id, userId }, include: INCLUDES, transaction: tx });
    }

    async markRead(id: number, userId: number, readAt: Date, tx: Transaction) {
        const [affected] = await Notification.update({ readAt }, { where: { id, userId, readAt: null }, transaction: tx });
        return affected;
    }

    async markAllRead(userId: number, readAt: Date, tx: Transaction) {
        const [affected] = await Notification.update({ readAt }, { where: { userId, readAt: null }, transaction: tx });
        return affected;
    }
}