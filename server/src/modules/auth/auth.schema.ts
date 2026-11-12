import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().min(1, "No puede estar vacío").max(255, "Máximo 255 caracteres"),
    password: z.string().min(1, "No puede estar vacía").max(200, "Máximo 200 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;