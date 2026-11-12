import type { Request, RequestHandler } from "express";
import type { UserRole } from "../models/User.js";
import type { UserRepository } from "../modules/users/user.repository.js";
import { AppError } from "./AppError.js";
import { verifyToken } from "./token.js";

export interface AuthUser {
    id: number;
    email: string;
    role: UserRole;
    storeIds: number[];
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

const ROLE_LEVEL: Record<UserRole, number> = { employee: 1, manager: 2, owner: 3};

export const createAuthenticate = (users: UserRepository): RequestHandler => async (req, _res, next) => {
    const match = req.headers.authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) {
        throw new AppError(401, "Autenticación requerida");
    }

    const userId = await verifyToken(match[1].trim());
    if (userId === null) {
        throw new AppError(401, "Sesión inválida o vencida");
    }

    const user = await users.findById(userId);
    if (!user || !user.isActive) {
        throw new AppError(401, "Sesión inválida o vencida");
    }

    req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        storeIds: (user.stores ?? []).map((store) => store.id),
    };
    next();
};

export const requireRole = (minRole: UserRole): RequestHandler => (req, _res, next) => {
    if (!req.user) {
        throw new AppError(401, "Autenticación requerida");
    }
    if (ROLE_LEVEL[req.user.role] < ROLE_LEVEL[minRole]) {
        throw new AppError(403, "No tenés permiso para realizar esta acción");
    }
    next();
};

export const getAuthUser = (req: Request): AuthUser => {
    if (!req.user) {
        throw new AppError(401, "Autenticación Requerida");
    }
    return req.user;
};