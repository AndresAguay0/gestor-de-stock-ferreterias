import { DataTypes } from "sequelize";
import type { Migration } from "../umzug.js";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable("notifications", {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "RESTRICT",
            onUpdate: "RESTRICT",
        },
        type: { type: DataTypes.STRING, allowNull: false },
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
        quantity: { type: DataTypes.INTEGER, allowNull: false },
        minQuantity: { type: DataTypes.INTEGER, allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        readAt: { type: DataTypes.DATE, allowNull: true },
    });

    await queryInterface.addIndex("notifications", ["userId", "readAt", "createdAt"], {
        name: "notifications_user_read_created",
    });
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("notifications");
};