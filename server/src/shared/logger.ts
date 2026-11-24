import { env } from "../config/env.js";

type LogLevel = "info" | "warn" | "error";
type LogData = Record<string, unknown>;

const isProduction = env.NODE_ENV === "production";

const serialize = (value: unknown): unknown =>
    value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;

const write = (level: LogLevel, msg: string, data: LogData = {}) => {
    const output = level === "error" ? console.error : level === "warn" ? console.warn : console.log;

    if (isProduction) {
        const entry: LogData = { time: new Date().toISOString(), level, msg };
        for (const [key, value] of Object.entries(data)) entry[key] = serialize(value);
        output(JSON.stringify(entry));
        return;
    }

    const time = new Date().toLocaleTimeString("es-AR", { hour12: false });
    output(`${time} ${level.toUpperCase().padEnd(5)} ${msg}`);
    if (data.err !== undefined) {
        output(data.err instanceof Error ? (data.err.stack ?? data.err.message) : String(data.err));
    }
};

export const logger = {
    info: (msg: string, data?: LogData) => write("info", msg, data),
    warn: (msg: string, data?: LogData) => write("warn", msg, data),
    error: (msg: string, data?: LogData) => write("error", msg, data),
};