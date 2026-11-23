import type { Request, Response } from "express";
import { getAuthUser } from "../../shared/auth.js";
import { parseId } from "../../shared/parseId.js";
import { parseOrThrow } from "../../shared/validate.js";
import { listNotificationsQuerySchema } from "./notification.schema.js";
import type { NotificationService } from "./notification.service.js";

export class NotificationController {
    constructor(private readonly service: NotificationService) {}

    list = async (req: Request, res: Response) => {
        const query = parseOrThrow(listNotificationsQuerySchema, req.query);
        res.json(await this.service.list(getAuthUser(req), query));
    };

    unreadCount = async (req: Request, res: Response) => {
        res.json(await this.service.unreadCount(getAuthUser(req)));
    };

    markRead = async (req: Request, res: Response) => {
        res.json(await this.service.markRead(getAuthUser(req), parseId(req.params.id, "id")));
    };

    markAllRead = async (req: Request, res: Response) => {
        res.json(await this.service.markAllRead(getAuthUser(req)));
    };
}