import { z } from "zod";

export { listProductsQuerySchema as listInventoryQuerySchema } from "../products/product.schema.js";

export const setMinQuantitySchema = z.object({
    minQuantity: z.number().nonnegative("No puede ser negativo"),
});

export type SetMinQuantityInput = z.infer<typeof setMinQuantitySchema>;