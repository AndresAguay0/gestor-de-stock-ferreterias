import { z } from "zod";
import { passwordSchema } from "../users/user.schema.js";

export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().min(1, "No puede estar vacío").max(255, "Máximo 255 caracteres"),
    password: z.string().min(1, "No puede estar vacía").max(200, "Máximo 200 caracteres"),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "No puede estar vacía").max(200, "Máximo 200 caracteres"),
    newPassword: passwordSchema
})

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;