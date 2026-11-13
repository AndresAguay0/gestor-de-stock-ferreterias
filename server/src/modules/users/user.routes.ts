import { Router, type RequestHandler } from "express";
import { requireRole } from "../../shared/auth.js";
import { validate } from "../../shared/validate.js";
import type { UserController } from "./user.controller.js";
import { createUserSchema, updateUserSchema } from "./user.schema.js";

export const createUserRouter = (controller: UserController, authenticate: RequestHandler) => {
    const router = Router();

    router.use(authenticate, requireRole("owner"));

    router.get("/", controller.list);
    router.get("/:id", controller.getById);
    router.post("/", validate(createUserSchema), controller.create);
    router.patch("/:id", validate(updateUserSchema), controller.update);

    return router;
};