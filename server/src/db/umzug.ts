import { fileURLToPath, pathToFileURL } from "node:url";
import { SequelizeStorage, Umzug } from "umzug";
import sequelize from "../config/database.js";

const migrationsDir = fileURLToPath(new URL("./migrations", import.meta.url));

export const migrator = new Umzug({
    migrations: {
        // en dev son .ts y compilado son .js
        glob: ["*.{ts,js}", { cwd: migrationsDir }],
        resolve: ({ name, path }) => {
            if (!path) throw new Error(`No se encontró el archivo de la migración ${name}`);
            const load = () => import(pathToFileURL(path).href);
            return {
                name,
                up: async (params) => (await load()).up(params),
                down: async (params) => (await load()).down(params),
            };
        },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
});

// Tipo que usan los archivos de migración
export type Migration = typeof migrator._types.migration;