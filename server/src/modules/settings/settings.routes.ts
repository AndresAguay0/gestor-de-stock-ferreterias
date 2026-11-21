import { Router, type RequestHandler } from "express";
import { requireRole } from "../../shared/auth.js";
import { validate } from "../../shared/validate.js";
import type { SettingsController } from "./settings.controller.js";
import { updateSettingsSchema } from "./settings.schema.js";

export const createSettingsRouter = (controller: SettingsController, authenticate: RequestHandler) => {
    const router = Router();

    router.use(authenticate);

    router.get("/", controller.get);
    router.patch("/", requireRole("owner"), validate(updateSettingsSchema), controller.update);

    return router;
};