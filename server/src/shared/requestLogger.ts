import type { Request, RequestHandler } from "express";
import { getAuthUser } from "./auth.js";
import { logger } from "./logger.js";

const userIdOf = (req: Request) => {
    try {
        return getAuthUser(req).id;
    } catch {
        return undefined;
    }
};

export const requestLogger: RequestHandler = (req, res, next) => {
    const started = process.hrtime.bigint();
    const { method, path } = req;

    res.on("finish", () => {
        const ms = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
        const status = res.statusCode;
        const userId = userIdOf(req);
        const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
        const user = userId !== undefined ? ` usuario=${userId}` : "";

        logger[level](`${method} ${path} ${status} ${ms}ms${user}`, { method, path, status, ms, userId, ip: req.ip });
    });

    next();
};