import { DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import sequelize from "../config/database.js";

export class UserStore extends Model<InferAttributes<UserStore>,InferCreationAttributes<UserStore>> {
    declare userId: number;
    declare hardwareStoreId: number;
}

UserStore.init(
    {
        userId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        hardwareStoreId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
    },
    {
        sequelize,
        tableName: "user_stores",
        timestamps: false,
    }
);