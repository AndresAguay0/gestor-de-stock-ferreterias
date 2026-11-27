import { z } from "zod";
import { listProductsQuerySchema } from "../products/product.schema.js";

export const listInventoryQuerySchema = listProductsQuerySchema.extend({
    belowMinimum: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
});

export const setMinQuantitySchema = z.object({
    minQuantity: z.number().nonnegative("No puede ser negativo"),
});

export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>;
export type SetMinQuantityInput = z.infer<typeof setMinQuantitySchema>;