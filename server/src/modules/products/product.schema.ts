import { z } from "zod";
import { UNIT_CODES } from "../../shared/quantity.js";

const name = z.string().trim().min(1, "No puede estar vacío").max(150, "Máximo 150 caracteres");
const category = z.string().trim().min(1, "No puede estar vacía").max(100, "Máximo 100 caracteres");

const description = z.string().trim().max(200, "Máximo 2000 caracteres").transform((value) => (value === "" ? null : value));

const priceCents = z.number().int("Tiene que ser un entero, en centavos").nonnegative("No puede ser negativo").max(2_000_000_000, "Es demasiado alto");

const sku = z.string().trim().min(1, "No puede estar vacío").max(64, "Máximo 65 caracteres").transform((value) => value.toUpperCase());

const barcode = z.string().trim().min(1, "No puede estar vacío").max(64, "Máximo 64 caracteres");

export const createProductSchema = z.object({
    name,
    description: description.optional(),
    category,
    unit: z.enum(UNIT_CODES),
    priceCents,
    sku: sku.optional(),
    barcode: barcode.optional(),
});

export const updateProductSchema = z.object({
    name: name.optional(),
    description: description.nullable().optional(),
    category: category.optional(),
    priceCents: priceCents.optional(),
    sku: sku.nullable().optional(),
    barcode: barcode.nullable().optional(),
    isActive: z.boolean().optional(),
    unit: z.unknown().optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: "Enviá al menos un campo para actualizar",
}).refine((data) => data.unit === undefined, {
    message: "La unidad no se puede cambiar",
    path: ["unit"],
});

const optionalText = (max: number) => z.string().trim().max(max, `Maximo ${max} caracteres`).optional().transform((value) => value || undefined);

export const listProductQuerySchema = z.object({
    search: optionalText(100),
    category: optionalText(100),
    barcode: optionalText(64),
    includeInactive: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductQuerySchema>;