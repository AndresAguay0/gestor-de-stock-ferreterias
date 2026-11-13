import { z } from "zod";

const email = z.string().trim().toLowerCase().max(255, "Máximo 255 caracteres").pipe(z.email("Email inválido"));

const password = z.string().min(8, "Debe tener al menos 8 caracteres")
.refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Es demasiado larga (máximo 72 bytes)");

const assignableRole = z.enum(["manager", "employee"]);

const storeIds = z.array(z.number().int().positive()).min(1, "Asigná al menos un local")
.refine((ids) => new Set(ids).size === ids.length, "No puede haber locales repetidos");

export const createUserSchema = z.object({
    email, password, role: assignableRole, storeIds
}).refine((data) => data.role !== "employee" || data.storeIds.length === 1, {
    message: "Un empleado debe estar asignado a exactamente un local",
    path: ["storeIds"],
});

export const updateUserSchema = z.object({
    email: email.optional(),
    role: assignableRole.optional(),
    isActive: z.boolean().optional(),
    storeIds: storeIds.optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: "Enviá al menos un campo para actualizar",
});

export const reassignStoresSchema = z.object({ storeIds });

export const resetPasswordSchema = z.object({ newPassword: password });

export const listUsersQuerySchema = z.object({
    includeInactive: z
        .enum(["true", "false"])
        .default("false")
        .transform((value) => value === "true"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export { email as emailSchema, password as passwordSchema };