import { AppError } from "./AppError.js";

// Convierte un parámetro de ruta en un entero positivo
export const parseId = (value: unknown, name = "id"): number => {
    const id = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new AppError(400, `El parámetro "${name}" debe ser un entero positivo`);
    }

    return id;
};