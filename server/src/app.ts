import express from "express";
import cors from "cors";
import { errorHandler, notFoundHandler } from "./shared/errorHandler.js";

// Rutas
import productRoutes from "./routes/product.routes.js";
import hardwareStoreRoutes from "./routes/hardwareStore.routes.js";
import userRoutes from "./routes/user.routes.js"

export const createApp = () => {
    const app = express();

    app.use(cors());
    app.use(express.json());

    // Uso de Rutas
    app.use("/api/products", productRoutes);
    app.use("/api/stores", hardwareStoreRoutes);
    app.use("/api/users", userRoutes);

    // Ruta de prueba
    app.get("/", (_req, res) => {
        res.json({ message: "API de Sistema de Gestión de Stock Para Ferreterías funcionando."});
    });

    // Manejadores de errores
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
};