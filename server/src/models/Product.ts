import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, NonAttribute } from "sequelize";
import sequelize from "../config/database.js";
import { UNIT_CODES, type UnitCode } from "../shared/quantity.js";
import type { Inventory } from "./Inventory.js";

export class Product extends Model<InferAttributes<Product>, InferCreationAttributes<Product>> {
    declare id: CreationOptional<number>;
    declare name: string;
    declare description: CreationOptional<string | null>;
    declare category: string;
    declare unit: UnitCode;
    declare priceCents: number;
    declare sku: CreationOptional<string | null>;
    declare barcode: CreationOptional<string | null>;
    declare isActive: CreationOptional<boolean>;

    declare inventories?: NonAttribute<Inventory[]>;
}

Product.init(
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
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        unit: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: { isIn: [[...UNIT_CODES]] },
        },
        priceCents: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 0 },
        },
        sku: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        barcode: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        tableName: "products",
    }
);