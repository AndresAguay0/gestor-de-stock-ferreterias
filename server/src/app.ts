import express from "express";
import cors from "cors";
import { errorHandler, notFoundHandler } from "./shared/errorHandler.js";
import {
    authController,
    authenticate,
    inventoryController,
    movementController,
    productController,
    reservationController,
    storeController,
    userController,
    settingsController,
} from "./container.js";

// Rutas
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createInventoryRouter } from "./modules/inventory/inventory.routes.js";
import { createProductRouter } from "./modules/products/product.routes.js";
import { createReservationRouter } from "./modules/reservations/reservation.routes.js";
import { createMovementRouter } from "./modules/stock-movements/movement.routes.js";
import { createStoreRouter } from "./modules/stores/store.routes.js";
import { createUserRouter } from "./modules/users/user.routes.js";
import { createSettingsRouter } from "./modules/settings/settings.routes.js";

export const createApp = () => {
    const app = express();

    app.use(cors());
    app.use(express.json());

    // Uso de Rutas
    app.use("/api/auth", createAuthRouter(authController, authenticate));
    app.use("/api/inventory", createInventoryRouter(inventoryController, authenticate));
    app.use("/api/movements", createMovementRouter(movementController, authenticate));
    app.use("/api/products", createProductRouter(productController, authenticate));
    app.use("/api/reservations", createReservationRouter(reservationController, authenticate));
    app.use("/api/settings", createSettingsRouter(settingsController, authenticate));
    app.use("/api/stores", createStoreRouter(storeController, authenticate));
    app.use("/api/users", createUserRouter(userController, authenticate));

    // Ruta de prueba
    app.get("/", (_req, res) => {
        res.json({ message: "API de Sistema de Gestión de Stock Para Ferreterías funcionando" });
    });

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
};