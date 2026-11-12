import { Router, type RequestHandler } from "express";
import { validate } from "../../shared/validate.js";
import type { AuthController } from "./auth.controller.js";
import { loginSchema } from "./auth.schema.js";

export const createAuthRouter = (controller: AuthController, authenticate: RequestHandler) => {
    const router = Router();

    router.post("/login", validate(loginSchema), controller.login);
    router.get("/me", authenticate, controller.me);

    return router;
};