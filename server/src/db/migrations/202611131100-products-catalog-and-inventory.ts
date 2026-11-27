import { DataTypes } from "sequelize";
import type { Migration } from "../umzug.js";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("products");

    await queryInterface.createTable("products", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        category: { type: DataTypes.STRING, allowNull: false },
        unit: { type: DataTypes.STRING, allowNull: false },
        priceCents: { type: DataTypes.INTEGER, allowNull: false },
        sku: { type: DataTypes.STRING, allowNull: true, unique: true },
        barcode: { type: DataTypes.STRING, allowNull: true, unique: true },
        isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable("inventories", {
        productId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: { model: "products", key: "id" },
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        },
        hardwareStoreId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: { model: "hardware_stores", key: "id" },
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        },
        quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        minQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
};

export const down: Migration = async () => {
    throw new Error("Migración irreversible: reemplazó la tabla de productos y sus datos de prueba");
};