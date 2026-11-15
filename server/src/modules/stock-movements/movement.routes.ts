import { Router, type RequestHandler } from "express";
import { requireRole } from "../../shared/auth.js";
import { validate } from "../../shared/validate.js";
import type { MovementController } from "./movement.controller.js";
import { createMovementSchema } from "./movement.schema.js";

export const createMovementRouter = (controller: MovementController, authenticate: RequestHandler) => {
    const router = Router();

    router.use(authenticate);

    router.post("/", validate(createMovementSchema), controller.register);

    router.get("/", requireRole("manager"), controller.list);

    return router;
};