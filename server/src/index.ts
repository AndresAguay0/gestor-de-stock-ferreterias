import type { Server } from "node:http";
import sequelize from "./config/database.js";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { waitForPendingTransactions } from "./db/transaction.js";
import { migrator } from "./db/umzug.js";

// Modelos
import "./models/index.js";

// Tiempo máximo de espera para apagar el servidor
const SHUTDOWN_TIMEOUT_MS = 10_000;

// Registra los handlers de señales para apagar ordenadamente
const registerShutdown = (server: Server) => {
    let shuttingDown = false;

    const shutdown = async (signal: string) => {
        
        // Esto evita empezar un segundo apagado si ya hay uno haciendose
        if (shuttingDown) {
            console.log("Segunda señal recibida: salida inmediata.");
            process.exit(1);
        }
        shuttingDown = true;
        console.log(`${signal} recibida: apagando el servidor...`);

        // Fuerza la salida si el apagado tarda mas del tiempo maximo
        const timer = setTimeout(() => {
            console.error("El apagado ordenado tardó demasiado: salida forzada.");
            process.exit(1);
        }, SHUTDOWN_TIMEOUT_MS);
        timer.unref();

        try {
            // Deja de aceptar nuevas conecciones y espera a que se cierren las que ya estan
            await new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            });

            // Espera a que terminen las transacciones pendientes antes de cerrar la base
            await waitForPendingTransactions();
            await sequelize.close();
            console.log("Servidor detenido.");
            process.exit(0);
        } catch (error) {
            console.error("Error durante el apagado:", error);
            process.exit(1);
        }
    };

    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
};

// Inicializa la conexion a la base de datos, ejecuta las migraciones y levanta el servidor
const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log("Conexión a la base de datos SQLite establecida con éxito");

        await migrator.up();
        console.log("Migraciones al día.");

        const app = createApp();
        const server = app.listen(env.PORT, (error?: Error) => {
            if (error) {
                console.error("No se pudo abrir el puerto:", error);
                process.exit(1);
            }
            console.log(`Servidor corriendo en http://localhost:${env.PORT}`);
        });

        registerShutdown(server);
    } catch (error) {
        console.error("Error al iniciar el servidor:", error);
        process.exit(1);
    }
};

startServer();