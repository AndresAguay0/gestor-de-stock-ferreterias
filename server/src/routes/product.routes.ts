import { Router } from "express";
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from "../controllers/product.controller.js";
import { validateProduct } from "../middlewares/validateProduct.js";
import { requireRole } from "../shared/auth.js";

const router = Router();

router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", requireRole("manager"), validateProduct, createProduct);
router.put("/:id", requireRole("manager"), validateProduct, updateProduct);
router.delete("/:id", requireRole("manager"), deleteProduct);

export default router;