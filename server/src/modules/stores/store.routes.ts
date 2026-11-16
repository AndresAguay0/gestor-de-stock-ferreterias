import { Router, type RequestHandler } from "express";
import { requireRole } from "../../shared/auth.js";
import { validate } from "../../shared/validate.js";
import type { StoreController } from "./store.controller.js";
import { createStoreSchema, updateStoreSchema } from "./store.schema.js";

export const createStoreRouter = (controller: StoreController, authenticate: RequestHandler) => {
    const router = Router();

    router.use(authenticate);

    router.get("/", controller.list);
    router.get("/:id", controller.getById);


    router.post("/", requireRole("owner"), validate(createStoreSchema), controller.create);
    router.patch("/:id", requireRole("owner"), validate(updateStoreSchema), controller.update);

    return router;
};