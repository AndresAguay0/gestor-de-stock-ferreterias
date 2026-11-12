import { Router } from "express";
import { validate } from "../../shared/validate.js";
import type { StoreController } from "./store.controller.js";
import { createStoreSchema, updateStoreSchema } from "./store.schema.js";

export const createStoreRouter = (controller: StoreController) => {
    const router = Router();

    router.get("/", controller.list);
    router.get("/:id", controller.getById);
    router.post("/", validate(createStoreSchema), controller.create);
    router.patch("/:id", validate(updateStoreSchema), controller.update);

    return router;
};