import { DataTypes } from "sequelize";
import type { Migration } from "../umzug.js";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable("reservations", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "products", key: "id" },
            onDelete: "RESTRICT",
            onUpdate: "RESTRICT",
        },
        hardwareStoreId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "hardware_stores", key: "id" },
            onDelete: "RESTRICT",
            onUpdate: "RESTRICT",
        },
        originStoreId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "hardware_stores", key: "id" },
            onDelete: "RESTRICT",
            onUpdate: "RESTRICT",
        },
        quantity: { type: DataTypes.INTEGER, allowNull: false },
        createdByUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "RESTRICT",
            onUpdate: "RESTRICT",
        },
        customerNote: { type: DataTypes.STRING, allowNull: true },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: "active" },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
        resolvedAt: { type: DataTypes.DATE, allowNull: true },
        resolvedByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "RESTRICT",
            onUpdate: "RESTRICT",
        },
        movementId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "stock_movements", key: "id" },
            onDelete: "RESTRICT",
            onUpdate: "RESTRICT",
        },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex("reservations", ["hardwareStoreId", "productId", "status", "expiresAt"], {
        name: "reservations_store_product_status_expires",
    });
    await queryInterface.addIndex("reservations", ["createdByUserId"], {
        name: "reservations_created_by_user",
    });
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("reservations");
};