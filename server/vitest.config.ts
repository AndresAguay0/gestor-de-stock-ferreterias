import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/**/*.test.ts"],
        setupFiles: ["tests/setup.ts"],
        pool: "forks",
        testTimeout: 15_000,
        hookTimeout: 30_000,
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            
            // Excluyo lo que no es logica de la app
            exclude: ["src/index.ts", "src/scripts/**", "src/db/migrate.ts", "src/db/migrations/**"],
            reporter: ["text", "html"],
        },
    },
});