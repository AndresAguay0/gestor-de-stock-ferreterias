import { env } from "../config/env.js";

type LogLevel = "info" | "warn" | "error";
type LogData = Record<string, unknown>;

const isProduction = env.NODE_ENV === "production";

// Convierte los objetos Error para usarlos en los registros JSON
const serialize = (value: unknown): unknown =>
    value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;

// Escribe un mensaje en consola usando el formato del entorno
const write = (level: LogLevel, msg: string, data: LogData = {}) => {
    const output = level === "error" ? console.error : level === "warn" ? console.warn : console.log;

    if (isProduction) {
        // En produccion se generan registros con mas datos
        const entry: LogData = { time: new Date().toISOString(), level, msg };
        for (const [key, value] of Object.entries(data)) entry[key] = serialize(value);
        output(JSON.stringify(entry));
        return;
    }

    // En desarrollo se usa un formato mas legible para la terminal
    const time = new Date().toLocaleTimeString("es-AR", { hour12: false });
    output(`${time} ${level.toUpperCase().padEnd(5)} ${msg}`);

    if (data.err !== undefined) {
        output(data.err instanceof Error ? (data.err.stack ?? data.err.message) : String(data.err));
    }
};

// Expone los metodos de registro disponibles para el resto de la aplicacion
export const logger = {
    info: (msg: string, data?: LogData) => write("info", msg, data),
    warn: (msg: string, data?: LogData) => write("warn", msg, data),
    error: (msg: string, data?: LogData) => write("error", msg, data),
};