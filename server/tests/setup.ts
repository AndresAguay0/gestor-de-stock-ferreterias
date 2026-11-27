import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, vi } from "vitest";

// Se ejecuta antes de cada archivo de pruebas y antes de que se cargue config/env.ts
// Cada archivo trabaja con su propia base SQLite temporal
const tempDir = mkdtempSync(join(tmpdir(), "ferreteria-test-"));

process.env.NODE_ENV = "test";
process.env.DB_PATH = join(tempDir, "test.sqlite");
process.env.JWT_SECRET = "clave-de-prueba-para-vitest-0123456789-abcdef";

// El registro de pedidos y el de migraciones no hacen falta en el resultado de las pruebas
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "info").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});

afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true, maxRetries: 3 });
});