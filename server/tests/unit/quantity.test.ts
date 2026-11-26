import { describe, expect, it } from "vitest";
import { AppError } from "../../src/shared/AppError.js";
import { fromStored, isBelowMinimum, toStored } from "../../src/shared/quantity.js";

// Devuelve el error que lanza la función (y falla si no lanza ninguno)
const catchError = (fn: () => unknown): AppError => {
    try {
        fn();
    } catch (error) {
        return error as AppError;
    }
    throw new Error("Se esperaba un error y no se lanzó");
};

describe("toStored y fromStored", () => {
    it("guardan las cantidades como enteros multiplicados por 1000 (caso normal)", () => {
        expect(toStored(2.5, "m")).toBe(2500);
        expect(toStored(10, "un")).toBe(10000);
        expect(fromStored(2500)).toBe(2.5);
    });

    it("redondean bien los números que la computadora representa con error (caso límite)", () => {
        expect(toStored(3.01, "m")).toBe(3010);
    });

    it("aceptan la cantidad máxima de decimales de cada unidad (caso límite)", () => {
        expect(toStored(1.234, "kg")).toBe(1234);
    });

    it("rechazan con un 400 más decimales de los que admite la unidad (error)", () => {
        const enteros = catchError(() => toStored(2.5, "un"));
        expect(enteros.status).toBe(400);
        expect(enteros.message).toContain("no admite decimales");

        const metros = catchError(() => toStored(2.555, "m"));
        expect(metros.status).toBe(400);
        expect(metros.message).toContain("admite hasta 2 decimales");

        expect(catchError(() => toStored(1.2345, "kg")).status).toBe(400);
    });
});

describe("isBelowMinimum", () => {
    it("cuenta cuando el stock es menor que el mínimo (caso normal)", () => {
        expect(isBelowMinimum(2000, 5000)).toBe(true);
        expect(isBelowMinimum(9000, 5000)).toBe(false);
    });

    it("un stock negativo siempre cuenta, aunque no haya mínimo (caso límite)", () => {
        expect(isBelowMinimum(-1000, 0)).toBe(true);
    });

    it("un mínimo de 0 significa sin alerta (caso límite)", () => {
        expect(isBelowMinimum(0, 0)).toBe(false);
        expect(isBelowMinimum(5000, 0)).toBe(false);
    });
});