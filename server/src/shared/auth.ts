import type { Request, RequestHandler } from "express";
import type { UserRole } from "../models/User.js";
import type { UserRepository } from "../modules/users/user.repository.js";
import { AppError } from "./AppError.js";
import { verifyToken } from "./token.js";

// Datos del usuario autenticado que quedan disponibles durante la peticion
export interface AuthUser {
    id: number;
    email: string;
    role: UserRole;
    storeIds: number[];
}

// Extiende el tipo Request para incluir los datos del usuario autenticado
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

// Asigna un nivel numerico a cada rol
const ROLE_LEVEL: Record<UserRole, number> = { employee: 1, manager: 2, owner: 3};

// Valida el token y carga los datos
export const createAuthenticate = (users: UserRepository): RequestHandler => async (req, _res, next) => {

    // Busca el token en el header
    const match = req.headers.authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) {
        throw new AppError(401, "Autenticación requerida");
    }

    const token = await verifyToken(match[1].trim());
    if (token === null) {
        throw new AppError(401, "Sesión inválida o vencida");
    }

    // Obtiene al usuario, se fija que siga activo y que la version del token sea valida
    const user = await users.findById(token.userId);
    if (!user || !user.isActive || user.tokenVersion !== token.tokenVersion) {
        throw new AppError(401, "Sesión inválida o vencida");
    }

    // Guarda en la peticion los datos necesarios del usuario
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

export const canAccessStore = (user: AuthUser, storeId: number): boolean => user.role === "owner" || user.storeIds.includes(storeId);