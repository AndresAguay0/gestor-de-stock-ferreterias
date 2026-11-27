import type { ErrorRequestHandler, RequestHandler } from "express";
import { ForeignKeyConstraintError, UniqueConstraintError } from "sequelize";
import { AppError } from "./AppError.js";
import { logger } from "./logger.js";

// Responde con un 404 cuando se pide una ruta que no existe
export const notFoundHandler: RequestHandler = (_req, res) => {
    res.status(404).json({ msg: "Ruta no encontrada" });
};

const isInvalidJsonError = (err: unknown): boolean =>
    typeof err === "object" && err !== null && "type" in err && err.type === "entity.parse.failed";


// Middleware centralizado para transformar los errores de la aplicacion en respuestas HTTP
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {

    // Si la respuesta ya se empezo a enviar delega el error a Express
    if (res.headersSent) {
        next(err);
        return;
    }

    // Maneja los errores controlados de la aplicacion
    if (err instanceof AppError) {
        res.status(err.status).json({ msg: err.message, errors: err.details });
        return;
    }

    if (isInvalidJsonError(err)) {
        res.status(400).json({ msg: "El cuerpo de la petición no es un JSON válido" });
        return;
    }

    if (err instanceof UniqueConstraintError) {
        res.status(409).json({ msg: "Ya existe un registro con esos datos" });
        return;
    }

    if (err instanceof ForeignKeyConstraintError) {
        res.status(409).json({ msg: "La operación referencia o depende de otros registros" });
        return;
    }

    // Registra los errores inesperados para facilitar el diagnostico
    logger.error("Error no controlado", { method: req.method, path: req.originalUrl.split("?")[0], err });
    res.status(500).json({ msg: "Error interno del servidor" });
};