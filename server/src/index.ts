import sequelize from "./config/database.js";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { migrator } from "./db/umzug.js";

// Modelos
import "./models/HardwareStore.js";
import "./models/User.js";
import "./models/UserHardwareStore.js";
import "./models/Product.js";

// Sincronización de base de datos y levante del server
const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log("Conexión a la base de datos SQLite establecida con éxito");

        await migrator.up();
        console.log("Migraciones al día.");

        const app = createApp();
        app.listen(env.PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${env.PORT}`);
        });
    } catch (error) {
        console.error("Error al iniciar el servidor:", error);
    }
};

startServer();