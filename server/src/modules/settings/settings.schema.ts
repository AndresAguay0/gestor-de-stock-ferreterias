import { z } from "zod";

const businessName = z.string().trim().max(100, "Máximo 100 caracteres").transform((value) => (value === "" ? null : value));

export const updateSettingsSchema = z.object({
    businessName: businessName.nullable().optional(),
    reservationDefaultMinutes: z.number().int("Tiene que ser un entero, en minutos").min(1, "Mínimo 1 minuto").max(4320, "Máximo 4320 minutos (72 horas)"). optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: "Enviá al menos un campo para actualizar",
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;