import { DataTypes } from "sequelize";
import type { Migration } from "../umzug.js";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable("settings", {
        id: { type: DataTypes.INTEGER, primaryKey: true },
        businessName: { type: DataTypes.STRING, allowNull: true },
        reservationDefaultMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 120 },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // Una sola fila, siempre con id 1
    const now = new Date();
    await queryInterface.bulkInsert("settings", [
        { id: 1, businessName: null, reservationDefaultMinutes: 120, createdAt: now, updatedAt: now },
    ]);
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("settings");
};