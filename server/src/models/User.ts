import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, NonAttribute } from "sequelize";
import sequelize from "../config/database.js";
import { HardwareStore } from "./HardwareStore.js";
import { UserStore } from "./UserStore.js";

export const USER_ROLES = ["owner", "manager", "employee"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export class User extends Model<InferAttributes<User>,InferCreationAttributes<User>> {
    declare id: CreationOptional<number>;
    declare email: string;
    declare passwordHash: string;
    declare role: CreationOptional<UserRole>;
    declare isActive: CreationOptional<boolean>;

    declare tokenVersion: CreationOptional<number>;

    declare stores?: NonAttribute<HardwareStore[]>;

    override toJSON(): object {
        const { passwordHash, ...safe } = this.get({ plain: true });
        return safe;
    }
}

User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        passwordHash: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "employee",
            validate: { isIn: [[...USER_ROLES]] },
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        tokenVersion: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        sequelize,
        tableName: "users",
        defaultScope: { attributes: { exclude: ["passwordHash"] } },
        scopes: { withPassword: {} },
    }
);

// Una persona puede estar asignada a varios locales (empleado: normalmente uno;
// gerente: uno o varios; el dueño accede a todos sin necesitar filas)
User.belongsToMany(HardwareStore, {
    through: UserStore,
    foreignKey: "userId",
    otherKey: "hardwareStoreId",
    as: "stores",
});
HardwareStore.belongsToMany(User, {
    through: UserStore,
    foreignKey: "hardwareStoreId",
    otherKey: "userId",
    as: "users",
});