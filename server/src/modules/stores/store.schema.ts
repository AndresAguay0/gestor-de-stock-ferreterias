import { z } from "zod";

const name = z.string().trim().min(1, "No puede estar vacío").max(100, "Máximo 100 caracteres");
const address = z.string().trim().min(1, "No puede estar vacío").max(255, "Máximo 255 caracteres");

export const createStoreSchema = z.object({ name, address });

export const updateStoreSchema = z.object({
    name: name.optional(),
    address: address.optional(),
    isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: "Envía al menos un campo para actualizar",
});

export const listStoresQuerySchema = z.object({
    includeInactive: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
export type ListStoresQuery = z.infer<typeof listStoresQuerySchema>;