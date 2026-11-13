import { Router, type RequestHandler } from "express";
import { requireRole } from "../../shared/auth.js";
import { validate } from "../../shared/validate.js";
import type { UserController } from "./user.controller.js";
import { createUserSchema, reassignStoresSchema, resetPasswordSchema, updateUserSchema } from "./user.schema.js";

export const createUserRouter = (controller: UserController, authenticate: RequestHandler) => {
    const router = Router();

    router.use(authenticate);

    router.get("/", requireRole("manager"), controller.list);
    router.get("/:id", requireRole("manager"), controller.getById);
    router.patch("/:id/stores", requireRole("manager"), validate(reassignStoresSchema), controller.reassignStores);

    router.post("/", requireRole("owner"), validate(createUserSchema), controller.create);
    router.patch("/:id", requireRole("owner"), validate(updateUserSchema), controller.update);
    router.put("/:id/password", requireRole("owner"), validate(resetPasswordSchema), controller.resetPassword);

    return router;
};