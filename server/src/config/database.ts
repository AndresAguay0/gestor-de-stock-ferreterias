import { Sequelize } from "sequelize";
import { env } from "./env.js";

const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: env.DB_PATH,
    logging: false,
});

export default sequelize;