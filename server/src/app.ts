import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./shared/errorHandler.js";
import { requestLogger } from "./shared/requestLogger.js";
import { logger } from "./shared/logger.js";
import {
    authController,
    authenticate,
    inventoryController,
    movementController,
    notificationController,
    productController,
    reservationController,
    storeController,
    userController,
    settingsController,
} from "./container.js";

// Rutas
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createInventoryRouter } from "./modules/inventory/inventory.routes.js";
import { createNotificationRouter } from "./modules/notifications/notification.routes.js";
import { createProductRouter } from "./modules/products/product.routes.js";
import { createReservationRouter } from "./modules/reservations/reservation.routes.js";
import { createMovementRouter } from "./modules/stock-movements/movement.routes.js";
import { createStoreRouter } from "./modules/stores/store.routes.js";
import { createUserRouter } from "./modules/users/user.routes.js";
import { createSettingsRouter } from "./modules/settings/settings.routes.js";

export const createApp = () => {
    const app = express();

    // Esto es por si mas adelante lo queremos usar, pero configura la cantidad de proxies de confianza si lo seteamos en el .env
    if (env.TRUST_PROXY > 0) app.set("trust proxy", env.TRUST_PROXY);

    app.use(requestLogger);
    app.use(helmet());
    
    // PENDIENTE (antes de publicar): CORS abierto solo para desarrollo local. Cuando el cliente y la API
    // estén en dominios distintos, restringirlo a los orígenes permitidos por variable de entorno
    // Seguramente hagamos eso para la entrega final.
    if (env.NODE_ENV === "production") {
        logger.warn("CORS está abierto a cualquier origen: restringirlo antes de publicar (ver app.ts)");
    }
    app.use(cors());
    app.use(express.json());

    // Registro de rutas de los modulos de la API
    app.use("/api/auth", createAuthRouter(authController, authenticate));
    app.use("/api/inventory", createInventoryRouter(inventoryController, authenticate));
    app.use("/api/movements", createMovementRouter(movementController, authenticate));
    app.use("/api/notifications", createNotificationRouter(notificationController, authenticate));
    app.use("/api/products", createProductRouter(productController, authenticate));
    app.use("/api/reservations", createReservationRouter(reservationController, authenticate));
    app.use("/api/settings", createSettingsRouter(settingsController, authenticate));
    app.use("/api/stores", createStoreRouter(storeController, authenticate));
    app.use("/api/users", createUserRouter(userController, authenticate));

    // Ruta de prueba
    app.get("/", (_req, res) => {
        res.json({ message: "API de Sistema de Gestión de Stock Para Ferreterías funcionando" });
    });

    // Registro de middlewares handlers de rutas que no existen y errores
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
};