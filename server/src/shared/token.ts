import { jwtVerify, SignJWT } from "jose";
import { env } from "../config/env.js";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export const signToken = (userId: number) =>
    new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(String(userId))
        .setIssuedAt()
        .setExpirationTime(env.JWT_EXPIRES_IN)
        .sign(secret);

export const verifyToken = async (token: string): Promise<number | null> => {
    try {
        const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
        const id = Number(payload.sub);
        return Number.isSafeInteger(id) && id > 0 ? id : null;
    } catch {
        return null;
    }
};