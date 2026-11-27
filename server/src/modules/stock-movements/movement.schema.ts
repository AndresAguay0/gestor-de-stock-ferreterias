import { z } from "zod";
import { MOVEMENT_REASONS, MOVEMENT_TYPES } from "../../models/StockMovement.js";

const productId = z.number().int().positive();
const storeId = z.number().int().positive();

const note = z.string().trim().max(255, "Máximo 255 caracteres").optional().transform((value) => value || undefined);

const clientRef = z.string().trim().min(1, "No puede estar vacía").max(64, "Máximo 64 caracteres").optional();

const base = { productId, storeId, note, clientRef };

const incomeSchema = z.object({
    ...base,
    type: z.literal("in"),
    reason: z.enum(MOVEMENT_REASONS.in),
    quantity: z.number().positive("Tiene que ser mayor que 0"),
});

const outcomeSchema = z.object({
    ...base,
    type: z.literal("out"),
    reason: z.enum(MOVEMENT_REASONS.out),
    quantity: z.number().positive("Tiene que ser mayor que 0"),
});

const adjustmentSchema = z.object({
    ...base,
    type: z.literal("adjustment"),
    reason: z.enum(MOVEMENT_REASONS.adjustment),
    countedQuantity: z.number().nonnegative("No puede ser negativo"),
});

const NOTE_REQUIRED = new Set<string>(["other", "correction"]);

export const createMovementSchema = z.discriminatedUnion("type", [incomeSchema, outcomeSchema, adjustmentSchema]).refine((data) => !NOTE_REQUIRED.has(data.reason) || data.note !== undefined, {
    message: "Este motivo requiere una nota que explique qué pasó",
    path: ["note"],
});

const ALL_REASONS = [...MOVEMENT_REASONS.in, ...MOVEMENT_REASONS.out, ...MOVEMENT_REASONS.adjustment] as const;

export const listMovementsQuerySchema = z.object({
    productId: z.coerce.number().int().positive().optional(),
    storeId: z.coerce.number().int().positive().optional(),
    userId: z.coerce.number().int().positive().optional(),
    type: z.enum(MOVEMENT_TYPES).optional(),
    reason: z.enum(ALL_REASONS).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
}).refine((query) => !query.from || !query.to || query.from < query.to, {
    message: "'from' tiene que ser anterior a 'to'",
    path: ["from"],
});

export type CreateMovementInput = z.infer<typeof createMovementSchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;