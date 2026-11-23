import { z } from "zod";
import { RESERVATION_STATES } from "../../models/Reservation.js";
import { MAX_RESERVATION_MINUTES } from "../settings/settings.schema.js";

const note = z.string().trim().max(255, "Máximo 255 caracteres").optional().transform((value) => value || undefined);

export const createReservationSchema = z.object({
    productId: z.number().int().positive(),
    storeId: z.number().int().positive(),
    quantity: z.number().positive("Tiene que ser mayor que 0"),
    minutes: z
        .number()
        .int("Tiene que ser un número entero")
        .min(1, "Tiene que ser de al menos 1 minuto")
        .max(MAX_RESERVATION_MINUTES, `Máximo ${MAX_RESERVATION_MINUTES} minutos`)
        .optional(),
    originStoreId: z.number().int().positive().optional(),
    customerNote: note,
});

export const listReservationsQuerySchema = z.object({
    status: z.enum(RESERVATION_STATES).optional(),
    storeId: z.coerce.number().int().positive().optional(),
    productId: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;