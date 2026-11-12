import { error } from "console";
import sequelize from "../config/database.js";
import { migrator } from "./umzug.js";

const command = process.argv[2];

const run = async () => {
    switch (command) {
        case "up":
            await migrator.up();
            break;
        case "down":
            await migrator.down();
            break;
        case "status": {
            const executed = await migrator.executed();
            const pending = await migrator.pending();
            console.log("Ejecutadas:", executed.map((m) => m.name));
            console.log("Pendientes:", pending.map((m) => m.name));
            break;
        }
        default:
            console.error("Uso: tsx src/db/migrate.ts <up|down|status>");
            process.exitCode = 1;
    }
};

run().catch((error) => {
    console.error("Error en las migraciones:", error);
    process.exitCode = 1;
}).finally(() => sequelize.close());