import { Router, type RequestHandler } from "express";
import { requireRole } from "../../shared/auth.js";
import { validate } from "../../shared/validate.js";
import type { InventoryController } from "./inventory.controller.js";
import { setMinQuantitySchema } from "./inventory.schema.js";

export const createInventoryRouter = (controller: InventoryController, authenticate: RequestHandler) => {
    const router = Router();

    router.use(authenticate);

    router.get("/", controller.list);
    router.get("/:productId", controller.getByProduct);

    router.patch("/:productId/stores/:storeId", requireRole("manager"), validate(setMinQuantitySchema), controller.setMinQuantity);

    return router;
};