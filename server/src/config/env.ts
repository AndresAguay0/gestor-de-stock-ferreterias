import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

config({ quiet: true });

const defaultDbPath = fileURLToPath(new URL("../../database.sqlite", import.meta.url));

const envSchema = z.object({
    PORT: z.coerce.number().int().positive().default(4000),
    DB_PATH: z.string().min(1).default(defaultDbPath),
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