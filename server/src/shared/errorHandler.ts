import type { ErrorRequestHandler, RequestHandler } from "express";
import { ForeignKeyConstraintError, UniqueConstraintError } from "sequelize";
import { AppError } from "./AppError.js";

export const notFoundHandler: RequestHandler = (_req, res) => {
    res.status(404).json({ msg: "Ruta no encontrada" });
};

const isInvalidJsonError = (err: unknown): boolean =>
    typeof err === "object" && err !== null && "type" in err && err.type === "entity.parse.failed";


export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, next) => {
    if (res.headersSent) {
        next(err);
        return;
    }

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

    console.error("Error no controlado:", err);
    res.status(500).json({ msg: "Error interno del servidor" });
};