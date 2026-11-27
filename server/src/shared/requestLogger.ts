import type { Request, RequestHandler } from "express";
import { getAuthUser } from "./auth.js";
import { logger } from "./logger.js";

// Obtiene el id del usuario autenticado
const userIdOf = (req: Request) => {
    try {
        return getAuthUser(req).id;
    } catch {
        return undefined;
    }
};

// Registra la informacion de cada peticion cuando se finaliza
export const requestLogger: RequestHandler = (req, res, next) => {
    const started = process.hrtime.bigint();
    const { method, path } = req;

    // Ejecuta el registro cuando Express termina de enviar la respuesta
    res.on("finish", () => {
        // Calcula el tiempo transcurrido desde el inicio de la peticion, en milisegundos
        const ms = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
        const status = res.statusCode;
        const userId = userIdOf(req);

        // Elige el nivel del registro segun el codigo de respuesta HTTP.
        const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
        const user = userId !== undefined ? ` usuario=${userId}` : "";

        logger[level](`${method} ${path} ${status} ${ms}ms${user}`, { method, path, status, ms, userId, ip: req.ip });
    });

    next();
};