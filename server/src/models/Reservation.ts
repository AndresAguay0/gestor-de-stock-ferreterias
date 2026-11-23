import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, NonAttribute } from "sequelize";
import sequelize from "../config/database.js";
import { HardwareStore } from "./HardwareStore.js";
import { Product } from "./Product.js";
import { StockMovement } from "./StockMovement.js";
import { User } from "./User.js";

export const RESERVATION_STATUSES = ["active", "picked_up", "cancelled"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];
export const RESERVATION_STATES = [...RESERVATION_STATUSES, "expired"] as const;
export type ReservationState = (typeof RESERVATION_STATES)[number];

export class Reservation extends Model<InferAttributes<Reservation>, InferCreationAttributes<Reservation>> {
    declare id: CreationOptional<number>;
    declare productId: number;
    declare hardwareStoreId: number;
    declare originStoreId: CreationOptional<number | null>;
    declare quantity: number;
    declare createdByUserId: number;
    declare customerNote: CreationOptional<string | null>;
    declare status: CreationOptional<ReservationStatus>;
    declare expiresAt: Date;
    declare resolvedAt: CreationOptional<Date | null>;
    declare resolvedByUserId: CreationOptional<number | null>;
    declare movementId: CreationOptional<number | null>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare product?: NonAttribute<Product>;
    declare store?: NonAttribute<HardwareStore>;
    declare originStore?: NonAttribute<HardwareStore>;
    declare createdBy?: NonAttribute<User>;
    declare resolvedBy?: NonAttribute<User>;
    declare movement?: NonAttribute<StockMovement>;
}

Reservation.init(
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
        originStoreId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1 },
        },
        createdByUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        customerNote: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "active",
            validate: { isIn: [[...RESERVATION_STATUSES]] },
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        resolvedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        resolvedByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        movementId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: "reservations",
    }
);

Reservation.belongsTo(Product, { foreignKey: "productId", as: "product" });
Reservation.belongsTo(HardwareStore, { foreignKey: "hardwareStoreId", as: "store" });
Reservation.belongsTo(HardwareStore, { foreignKey: "originStoreId", as: "originStore" });
Reservation.belongsTo(User, { foreignKey: "createdByUserId", as: "createdBy" });
Reservation.belongsTo(User, { foreignKey: "resolvedByUserId", as: "resolvedBy" });
Reservation.belongsTo(StockMovement, { foreignKey: "movementId", as: "movement" });