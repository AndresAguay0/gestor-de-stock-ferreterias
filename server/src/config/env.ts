import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

config({ quiet: true });

const defaultDbPath = fileURLToPath(new URL("../../database.sqlite", import.meta.url));

const envSchema = z.object({
    PORT: z.coerce.number().int().positive().default(4000),
    DB_PATH: z.string().min(1).default(defaultDbPath),
    JWT_SECRET: z.string().min(32, "Debe tener al menos 32 caracteres"),
    JWT_EXPIRES_IN: z.string().min(1).default("12h"),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
    CHANGE_PASSWORD_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error("Variables de entorno inválidas:");
    for (const issue of result.error.issues) {
        console.error(` - ${issue.path.map(String).join(".")}: ${issue.message}`);
    }
    process.exit(1);
}

export const env = result.data;