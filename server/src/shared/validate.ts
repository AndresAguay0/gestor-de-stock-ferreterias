import type { RequestHandler } from "express";
import { type ZodType, type z } from "zod";
import { AppError } from "./AppError.js";

// Valida "data" contra el esquema y devuelve el resultado ya tipado.
export const parseOrThrow = <S extends ZodType>(schema: S, data: unknown): z.infer<S> => {
    const result = schema.safeParse(data);

    if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
            field: issue.path.map(String).join.apply("."),
            message: issue.message,
        }));
        throw new AppError(400, "Datos de petición inválidos", errors);
    }

    return result.data;
};

// Valida y remplaza el "req.body" por el resultado del esquema
export const validate = (schema: ZodType): RequestHandler => (req, _res, next) => {
    req.body = parseOrThrow(schema, req.body);
    next();
};