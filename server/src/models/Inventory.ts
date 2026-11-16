import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import sequelize from "../config/database.js";
import { HardwareStore } from "./HardwareStore.js";
import { Product } from "./Product.js";

export class Inventory extends Model<InferAttributes<Inventory>, InferCreationAttributes<Inventory>> {
    declare productId: number;
    declare hardwareStoreId: number;
    declare quantity: CreationOptional<number>;
    declare minQuantity: CreationOptional<number>;
}

Inventory.init(
    {
        productId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        hardwareStoreId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        minQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: { min: 0 },
        },
    },
    {
        sequelize,
        tableName: "inventories",
    }
);

Product.hasMany(Inventory, { foreignKey: "productId", as: "inventories", onDelete: "RESTRICT" });
Inventory.belongsTo(Product, { foreignKey: "productId", as: "product" });

HardwareStore.hasMany(Inventory, { foreignKey: "hardwareStoreId", as: "inventories", onDelete: "RESTRICT" });
Inventory.belongsTo(HardwareStore, { foreignKey: "hardwareStoreId", as: "store" });