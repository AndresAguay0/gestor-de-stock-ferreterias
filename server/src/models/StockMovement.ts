import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, NonAttribute } from "sequelize";
import sequelize from "../config/database.js";
import { HardwareStore } from "./HardwareStore.js";
import { Product } from "./Product.js";
import { User } from "./User.js";

export const MOVEMENT_TYPES = ["in", "out", "adjustment"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_REASONS = {
    in: ["purchase", "customer_return", "other"],
    out: ["sale", "damage", "loss", "other"],
    adjustment: ["count", "correction"],
} as const;
export type MovementReason = (typeof MOVEMENT_REASONS)[MovementType][number];

const ALL_MOVEMENT_REASONS = [
    ...new Set([...MOVEMENT_REASONS.in, ...MOVEMENT_REASONS.out, ...MOVEMENT_REASONS.adjustment]),
];

export class StockMovement extends Model<InferAttributes<StockMovement>, InferCreationAttributes<StockMovement>> {
    declare id: CreationOptional<number>;
    declare productId: number;
    declare hardwareStoreId: number;
    declare userId: number;
    declare type: MovementType;
    declare reason: MovementReason;
    declare quantity: number;
    declare resultingQuantity: number;
    declare note: CreationOptional<string | null>;
    declare clientRef: CreationOptional<string | null>;
    declare createdAt: CreationOptional<Date>;

    declare product?: NonAttribute<Product>;
    declare store?: NonAttribute<HardwareStore>;
    declare user?: NonAttribute<User>;
}

StockMovement.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        hardwareStoreId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: { isIn: [[...MOVEMENT_TYPES]] },
        },
        reason: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: { isIn: [ALL_MOVEMENT_REASONS] },
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        resultingQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        note: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        clientRef: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: "stock_movements",
        updatedAt: false,
    }
);

StockMovement.belongsTo(Product, { foreignKey: "productId", as: "product" });
StockMovement.belongsTo(HardwareStore, { foreignKey: "hardwareStoreId", as: "store" });
StockMovement.belongsTo(User, { foreignKey: "userId", as: "user" });