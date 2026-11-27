import { Sequelize } from "sequelize";
import { env } from "./env.js";

// Configura la conexion a SQLite con Sequelize
const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: env.DB_PATH,
    logging: false, // Desactiva logs de querys SQL en la terminal 
});

export default sequelize;