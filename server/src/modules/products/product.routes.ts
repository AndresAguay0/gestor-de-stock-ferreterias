import { Router, type RequestHandler } from "express";
import { requireRole } from "../../shared/auth.js";
import { validate } from "../../shared/validate.js";
import type { ProductController } from "./product.controller.js";
import { createProductSchema, updateProductSchema } from "./product.schema.js";

export const createProductRouter = (controller: ProductController, authenticate: RequestHandler) => {
    const router = Router();

    router.use(authenticate);

    router.get("/", controller.list);
    router.get("/:id", controller.getById);
    
    router.post("/", requireRole("manager"), validate(createProductSchema), controller.create);
    router.patch("/:id", requireRole("manager"), validate(updateProductSchema), controller.update);

    return router;
};