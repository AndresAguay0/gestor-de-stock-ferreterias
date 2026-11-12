import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import sequelize from "../config/database.js";

export class HardwareStore extends Model<
InferAttributes<HardwareStore>,
InferCreationAttributes<HardwareStore>
> {
    declare id: CreationOptional<number>;
    declare name: string;
    declare address: string;
    declare isActive: CreationOptional<boolean>;
}

HardwareStore.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        address: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        tableName: "hardware_stores",
    }
);