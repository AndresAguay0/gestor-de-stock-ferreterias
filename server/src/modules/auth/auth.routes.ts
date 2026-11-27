import { Router, type RequestHandler } from "express";
import { changePasswordLimiter, loginLimiter } from "../../shared/rateLimit.js";
import { validate } from "../../shared/validate.js";
import type { AuthController } from "./auth.controller.js";
import { changePasswordSchema, loginSchema } from "./auth.schema.js";

export const createAuthRouter = (controller: AuthController, authenticate: RequestHandler) => {
    const router = Router();

    router.post("/login", loginLimiter, validate(loginSchema), controller.login);
    router.get("/me", authenticate, controller.me);
    router.post("/change-password", authenticate, changePasswordLimiter, validate(changePasswordSchema), controller.changePassword);

    return router;
};