import { DataTypes } from "sequelize";
import type { Migration } from "../umzug.js";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable("stock_movements", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "products", key: "id" },
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        },
        hardwareStoreId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "hardware_stores", key: "id" },
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        },

        type: { type: DataTypes.STRING, allowNull: false },
        reason: { type: DataTypes.STRING, allowNull: false },
        quantity: { type: DataTypes.INTEGER, allowNull: false },
        resultingQuantity: { type: DataTypes.INTEGER, allowNull: false },
        note: { type: DataTypes.STRING, allowNull: true },
        clientRef: { type: DataTypes.STRING, allowNull: true, unique: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex("stock_movements", ["hardwareStoreId", "createdAt"], {
        name: "stock_movements_store_created_idx",
    });
    await queryInterface.addIndex("stock_movements", ["productId", "createdAt"], {
        name: "stock_movements_product_created_idx",
    });
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("stock_movements");
};