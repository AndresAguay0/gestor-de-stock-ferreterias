import { Request, Response } from "express";
import { Product } from "../models/Product.js";
import { HardwareStore } from "../models/HardwareStore.js";
import { json } from "sequelize";

// GET products y GET products?id
export const getProducts = async (req: Request, res: Response) => {
    try {
        // Campo opcional por id de Ferreteria
        const { hardwareStoreId } = req.query;
        const whereCondition: { hardwareStoreId?: number } = {};

        if (hardwareStoreId !== undefined) {
            const storeId = Number(hardwareStoreId);
            if (!Number.isInteger(storeId) || storeId <= 0) {
                return res.status(400).json({ msg: "hardwareStoreId debe ser un entero positivo" });
            }
            whereCondition.hardwareStoreId = storeId;
        }

        const products = await Product.findAll({
            where: whereCondition,
            include: [{ model: HardwareStore, as: "hardwareStore" }]
        });
        return res.json(products);
    } catch (error) {
        console.error("Error al obtener productos:", error);
        return res.status(500).json({ msg: "Error interno del servidor" });
    }
};

// GET product/:id
export const getProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk( Number(id), {
            include: [{ model: HardwareStore, as: "hardwareStore" }]
        });

        if (!product) {
            return res.status(404).json({ msg: "Producto no encontrado" });
        }

        return res.json(product);
    } catch (error) {
        console.error("Error al obtener el producto:", error);
        return res.status(500).json({ msg: "Error interno del servidor" })
    }
};

// POST producto
export const createProduct = async (req: Request, res: Response) => {
    try {
        const { name, description, price, stock, minStock, category, hardwareStoreId } = req.body;

        const store = await HardwareStore.findByPk(hardwareStoreId);
        if (!store) {
            return res.status(404).json({ msg: "La ferretería especificada no existe" });
        }

        const newProduct = await Product.create({
            name,
            description,
            price,
            stock,
            minStock,
            category,
            hardwareStoreId
        });

        return res.status(201).json(newProduct);
    } catch (error) {
        console.error("Error al crear producto:", error);
        return res.status(500).json({ msg: "Error interno del servidor" });
    }
};

// PUT producto/:id
export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(Number(id));

        if (!product) {
            return res.status(404).json({ msg: "Producto no encontrado" });
        }

        await product.update(req.body);
        return res.json({ msg: "Producto actualizado con éxito", product });
    } catch (error) {
        console.error("Error al actualizar producto:", error);
        return res.status(500).json({ msg: "Error interno del servidor" });
    }
};

// DELETE product/:id
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(Number(id));

        if (!product) {
            return res.status(404).json({ msg: "Producto no encontrado" });
        }

        await product.destroy();
        return res.json({ msg: "Producto eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar producto:", error);
        return res.status(500).json({ msg: "Error interno del servidor" });
    }
}