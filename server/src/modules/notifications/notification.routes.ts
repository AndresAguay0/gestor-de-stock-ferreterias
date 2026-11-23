import { Router, type RequestHandler } from "express";
import type { NotificationController } from "./notification.controller.js";

export const createNotificationRouter = (controller: NotificationController, authenticate: RequestHandler) => {
    const router = Router();

    router.use(authenticate);

    router.get("/", controller.list);
    router.get("/unread-count", controller.unreadCount);
    router.post("/read-all", controller.markAllRead);
    router.post("/:id/read", controller.markRead);

    return router;
};