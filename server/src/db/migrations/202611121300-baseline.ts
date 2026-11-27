import { DataTypes } from "sequelize";
import type { Migration } from "../umzug.js";

// Estado actual de la base, tal como lo creaba sync().
// Las migraciones siguientes la van transformando módulo por módulo.
export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable("hardware_stores", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false },
        address: { type: DataTypes.STRING, allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable("users", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        passwordHash: { type: DataTypes.STRING, allowNull: false },
        role: {
            type: DataTypes.ENUM("dueño", "gerente", "empleado"),
            allowNull: false,
            defaultValue: "empleado",
        },
        hardwareStoreId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "hardware_stores", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable("products", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        price: { type: DataTypes.FLOAT, allowNull: false },
        stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        minStock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
        category: { type: DataTypes.STRING, allowNull: false },
        // RESTRICT: no se puede borrar una ferretería que todavía tiene productos
        hardwareStoreId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "hardware_stores", key: "id" },
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable("user_hardware_stores", {
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
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        },
    });
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("user_hardware_stores");
    await queryInterface.dropTable("products");
    await queryInterface.dropTable("users");
    await queryInterface.dropTable("hardware_stores");
};