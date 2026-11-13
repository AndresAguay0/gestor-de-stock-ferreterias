import express from "express";
import cors from "cors";
import { errorHandler, notFoundHandler } from "./shared/errorHandler.js";
import { authController, authenticate, storeController, userController } from "./container.js";

// Rutas
import productRoutes from "./routes/product.routes.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createStoreRouter } from "./modules/stores/store.routes.js";
import { createUserRouter } from "./modules/users/user.routes.js";

export const createApp = () => {
    const app = express();

    app.use(cors());
    app.use(express.json());

    // Uso de Rutas
    app.use("/api/auth", createAuthRouter(authController, authenticate));
    app.use("/api/products", productRoutes);
    app.use("/api/stores", createStoreRouter(storeController));
    app.use("/api/users", createUserRouter(userController, authenticate));

    // Ruta de prueba
    app.get("/", (_req, res) => {
        res.json({ message: "API de Sistema de Gestión de Stock Para Ferreterías funcionando."});
    });

    // Manejadores de errores
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
};