import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import sequelize from "../config/database.js";

export const SETTINGS_ID = 1;

export class Setting extends Model<InferAttributes<Setting>, InferCreationAttributes<Setting>> {
    declare id: number;
    declare businessName: CreationOptional<string | null>;
    declare reservationDefaultMinutes: CreationOptional<number>;
}

Setting.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        businessName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        reservationDefaultMinutes: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 120,
            validate: { min: 1, max: 4320 },
        },
    },
    {
        sequelize,
        tableName: "settings",
    }
);