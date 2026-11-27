import type { EventBus } from "../../shared/events.js";
import type { NotificationService } from "./notification.service.js";

export const registerNotificationListeners = (events: EventBus, service: NotificationService) => {
    events.on("stock.changed", async (event) => {
        await service.handleStockChanged(event);
    });
};