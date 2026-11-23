import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, NonAttribute } from "sequelize";
import sequelize from "../config/database.js";
import { HardwareStore } from "./HardwareStore.js";
import { Product } from "./Product.js";
import { User } from "./User.js";

export const NOTIFICATION_TYPES = ["low_stock"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
    declare id: CreationOptional<number>;
    declare userId: number;
    declare type: NotificationType;
    declare productId: number;
    declare hardwareStoreId: number;
    declare quantity: number;
    declare minQuantity: number;
    declare createdAt: CreationOptional<Date>;
    declare readAt: CreationOptional<Date | null>;

    declare user?: NonAttribute<User>;
    declare product?: NonAttribute<Product>;
    declare store?: NonAttribute<HardwareStore>;
}

Notification.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: { isIn: [[...NOTIFICATION_TYPES]] },
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        hardwareStoreId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        minQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        readAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "notifications",
        updatedAt: false,
    }
);

Notification.belongsTo(User, { foreignKey: "userId", as: "user" });
Notification.belongsTo(Product, { foreignKey: "productId", as: "product" });
Notification.belongsTo(HardwareStore, { foreignKey: "hardwareStoreId", as: "store" });