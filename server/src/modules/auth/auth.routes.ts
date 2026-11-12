import { Router } from "express";
import { validate } from "../../shared/validate.js";
import type { AuthController } from "./auth.controller.js";
import { loginSchema } from "./auth.schema.js";

export const createAuthRouter = (controller: AuthController) => {
    const router = Router();

    router.post("/login", validate(loginSchema), controller.login);

    return router;
};