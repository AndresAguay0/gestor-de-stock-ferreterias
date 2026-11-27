import { jwtVerify, SignJWT } from "jose";
import { env } from "../config/env.js";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export const signToken = (userId: number, tokenVersion: number) =>
    new SignJWT({ ver: tokenVersion })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(String(userId))
        .setIssuedAt()
        .setExpirationTime(env.JWT_EXPIRES_IN)
        .sign(secret);

export interface TokenData {
    userId: number;
    tokenVersion: number;
}

export const verifyToken = async (token: string): Promise<TokenData | null> => {
    try {
        const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
        const userId = Number(payload.sub);
        const tokenVersion = payload.ver;

        if (!Number.isSafeInteger(userId) || userId <= 0) return null;
        if (typeof tokenVersion !== "number" || !Number.isSafeInteger(tokenVersion) || tokenVersion < 0) return null;

        return { userId, tokenVersion };
    } catch {
        return null;
    }
};