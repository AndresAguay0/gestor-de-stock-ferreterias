import request from "supertest";
import { afterAll, beforeAll } from "vitest";
import { createApp } from "../src/app.js";
import sequelize from "../src/config/database.js";
import { migrator } from "../src/db/umzug.js";
import { UserRepository } from "../src/modules/users/user.repository.js";
import { hashPassword } from "../src/shared/password.js";

const app = createApp();

// Cliente HTTP de prueba que llama a las rutas de la aplicación sin abrir ningún puerto
export const http = () => request(app);

export const OWNER = { email: "dueno@test.com", password: "clave-segura-123" };
export const USER_PASSWORD = "clave-segura-456";

// Arma la estructura de la base temporal con las migraciones al empezar el archivo y cierra la conexión al terminar
export const useTestDatabase = () => {
    beforeAll(async () => {
        await migrator.up();
    });

    afterAll(async () => {
        await sequelize.close();
    });
};

// Falla con un mensaje claro si un paso de preparación no responde lo esperado
export const must = (res: request.Response, expected: number, what: string) => {
    if (res.status !== expected) {
        throw new Error(`${what}: se esperaba ${expected} y llegó ${res.status} ${JSON.stringify(res.body)}`);
    }
    return res;
};

export const withToken = (token: string) => ({ Authorization: `Bearer ${token}` });

export const login = async (email: string, password: string) => {
    const res = must(await http().post("/api/auth/login").send({ email, password }), 200, `Iniciar sesión (${email})`);
    return res.body.token as string;
};

// El dueño se crea directo en la base, igual que hace el script create-owner
export const createOwnerAndLogin = async () => {
    await new UserRepository().create({
        email: OWNER.email,
        passwordHash: await hashPassword(OWNER.password),
        role: "owner",
    });
    return login(OWNER.email, OWNER.password);
};

export const makeStore = async (ownerToken: string, name: string) => {
    const res = await http().post("/api/stores").set(withToken(ownerToken)).send({ name, address: "Calle de prueba" });
    return must(res, 201, `Crear el local ${name}`).body.id as number;
};

// Crea el usuario y devuelve su id, su email y su token de sesión
export const makeUserWithId = async (
    ownerToken: string,
    email: string,
    role: "manager" | "employee",
    storeIds: number[],
) => {
    const res = await http()
        .post("/api/users")
        .set(withToken(ownerToken))
        .send({ email, password: USER_PASSWORD, role, storeIds });
    must(res, 201, `Crear a ${email}`);
    return { id: res.body.id as number, email, token: await login(email, USER_PASSWORD) };
};

// Lo mismo, pero devuelve solo el token
export const makeUser = async (...args: Parameters<typeof makeUserWithId>) => (await makeUserWithId(...args)).token;

export const makeProduct = async (ownerToken: string, name: string, unit: string) => {
    const res = await http()
        .post("/api/products")
        .set(withToken(ownerToken))
        .send({ name, category: "Prueba", unit, priceCents: 100 });
    return must(res, 201, `Crear el producto ${name}`).body.id as number;
};