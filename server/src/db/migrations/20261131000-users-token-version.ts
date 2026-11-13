import { DataTypes } from "sequelize";
import type { Migration } from "../umzug.js";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.addColumn("users", "tokenVersion", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    });
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query("ALTER TABLE users DROP COLUMN tokenVersion;");
};