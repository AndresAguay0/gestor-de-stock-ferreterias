import { AppError } from "./AppError.js";

export const UNITS = {
    un: { name: "Unidad", decimals: 0 },
    par: { name: "Par", decimals: 0 },
    caja: { name: "Caja", decimals: 0 },
    bolsa: { name: "Bolsa", decimals: 0 },
    rollo: { name: "Rollo", decimals: 0 },
    m: { name: "Metro", decimals: 2 },
    m2: { name: "Metro cuadrado", decimals: 2 },
    kg: { name: "Kilogramo", decimals: 3 },
    l: { name: "Litro", decimals: 3 },
} as const;

export type UnitCode = keyof typeof UNITS;
export const UNIT_CODES = Object.keys(UNITS) as [UnitCode, ...UnitCode[]];

const SCALE = 1000;

export const toStored = (value: number, unit: UnitCode): number => {
    if (!Number.isFinite(value)) {
        throw new AppError(400, "La cantidad debe ser un número");
    }

    const { name, decimals} = UNITS[unit];
    const factor = 10 ** decimals;
    const scaled = value * factor;

    const tolerance = 4 * Number.EPSILON * Math.max(1, Math.abs(scaled));
    if (Math.abs(scaled - Math.round(scaled)) > tolerance) {
        throw new AppError( 400,
            decimals === 0
                ? `La unidad "${name}" no admite decimales`
                : `La unidad "${name}" admite hasta ${decimals} decimales`,
        );
    }

    const stored = Math.round(scaled) * (SCALE / factor);
    if (!Number.isSafeInteger(stored)) {
        throw new AppError(400, "La cantidad es demasiado grande");
    }

    return stored;
};

export const fromStored = (stored: number): number => stored / SCALE;