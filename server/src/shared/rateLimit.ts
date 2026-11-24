import type { Request, Response } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";
import { getAuthUser } from "./auth.js";

const tooManyAttempts = (_req: Request, res: Response) => {
    res.status(429).json({ msg: "Demasiados intentos fallidos. Esperá unos minutos antes de volver a intentar" });
};

// Configuracion compartida por los limitadores
const failedAttemptsOnly = {
    windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60_000,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: tooManyAttempts,
} as const;

// Limita los intentos de login por IP y email
export const loginLimiter = rateLimit({
    ...failedAttemptsOnly,
    limit: env.LOGIN_MAX_ATTEMPTS,
    keyGenerator: (req) => {
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        return `${ipKeyGenerator(req.ip ?? "")}|${email}`;
    },
});

// Limita los intentos de cambio de contraseña por el identificador del usuario autenticado
export const changePasswordLimiter = rateLimit({
    ...failedAttemptsOnly,
    limit: env.CHANGE_PASSWORD_MAX_ATTEMPTS,
    keyGenerator: (req) => `user:${getAuthUser(req).id}`,
});