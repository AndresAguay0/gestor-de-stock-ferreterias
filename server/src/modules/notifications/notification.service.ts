import type { Transaction } from "sequelize";
import type { TransactionRunner } from "../../db/transaction.js";
import type { Notification } from "../../models/Notification.js";
import { AppError } from "../../shared/AppError.js";
import type { AuthUser } from "../../shared/auth.js";
import type { StockChangedEvent } from "../../shared/events.js";
import { fromStored, isBelowMinimum } from "../../shared/quantity.js";
import type { UserRepository } from "../users/user.repository.js";
import type { NotificationRepository } from "./notification.repository.js";
import type { ListNotificationsQuery } from "./notification.schema.js";

export class NotificationService {
    constructor(
        private readonly notifications: NotificationRepository,
        private readonly users: UserRepository,
        private readonly db: TransactionRunner,
        private readonly now: () => Date = () => new Date(),
    ) {}

    async handleStockChanged(event: StockChangedEvent) {
        const crossedDown =
            !isBelowMinimum(event.previousQuantity, event.minQuantity) &&
            isBelowMinimum(event.quantity, event.minQuantity);
        if (!crossedDown) return 0;

        return this.db.run(async (tx) => {
            const owners = await this.users.findActiveOwners(tx);
            const managers = await this.users.findActiveManagersInStore(event.storeId, tx);

            const created = await this.notifications.createMany(
                [...owners, ...managers].map((user) => ({
                    userId: user.id,
                    type: "low_stock" as const,
                    productId: event.productId,
                    hardwareStoreId: event.storeId,
                    quantity: event.quantity,
                    minQuantity: event.minQuantity,
                })),
                tx,
            );

            return created.length;
        });
    }

    async list(actor: AuthUser, query: ListNotificationsQuery) {
        const { items, total } = await this.notifications.findAllForUser(actor.id, {
            unread: query.unread,
            limit: query.limit,
            offset: query.offset,
        });

        return {
            items: items.map((notification) => this.view(notification)),
            total,
            limit: query.limit,
            offset: query.offset,
        };
    }

    async unreadCount(actor: AuthUser) {
        return { count: await this.notifications.countUnread(actor.id) };
    }

    async markRead(actor: AuthUser, id: number) {
        const now = this.now();

        return this.db.run(async (tx) => {
            const current = await this.loadOwned(actor, id, tx);

            if (!current.readAt) {
                await this.notifications.markRead(id, actor.id, now, tx);
            }

            return this.view(await this.loadOwned(actor, id, tx));
        });
    }

    async markAllRead(actor: AuthUser) {
        const now = this.now();
        const updated = await this.db.run((tx) => this.notifications.markAllRead(actor.id, now, tx));
        return { updated };
    }

    private async loadOwned(actor: AuthUser, id: number, tx: Transaction) {
        const notification = await this.notifications.findOwned(id, actor.id, tx);
        if (!notification) throw new AppError(404, "Notificación no encontrada");
        return notification;
    }

    private view(notification: Notification) {
        return {
            id: notification.id,
            type: notification.type,
            productId: notification.productId,
            storeId: notification.hardwareStoreId,
            quantity: fromStored(notification.quantity),
            minQuantity: fromStored(notification.minQuantity),
            createdAt: notification.createdAt,
            readAt: notification.readAt ?? null,
            product: notification.product
                ? { id: notification.product.id, name: notification.product.name, unit: notification.product.unit }
                : null,
            store: notification.store ? { id: notification.store.id, name: notification.store.name } : null,
        };
    }
}