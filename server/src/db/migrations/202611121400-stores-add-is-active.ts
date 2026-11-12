import { DataTypes } from "sequelize";
import type { Migration } from "../umzug.js";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.addColumn("hardware_stores", "isActive", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    });
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query("ALTER TABLE hardware_stores DROP COLUMN isActive;");
};