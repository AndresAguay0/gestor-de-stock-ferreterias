import { z } from "zod";

const booleanQuery = z.enum(["true", "false"]).transform((value) => value === "true");

export const listNotificationsQuerySchema = z.object({
    unread: booleanQuery.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;