import { DataTypes } from "sequelize";
import type { Migration } from "../umzug.js";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("user_hardware_stores");
    await queryInterface.dropTable("users");

    await queryInterface.createTable("users", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        passwordHash: { type: DataTypes.STRING, allowNull: false },
        role: { type: DataTypes.STRING, allowNull: false, defaultValue: "employee" },
        isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable("user_stores", {
        userId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        },
        hardwareStoreId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: { model: "hardware_stores", key: "id" },
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        },
    });
};

export const down: Migration = async () => {
    throw new Error("Migración irreversible: reemplazó las tablas de usuarios y sus datos de prueba");
};