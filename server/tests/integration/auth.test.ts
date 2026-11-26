import { beforeAll, describe, expect, it } from "vitest";
import { env } from "../../src/config/env.js";
import {
    OWNER,
    USER_PASSWORD,
    createOwnerAndLogin,
    http,
    makeStore,
    makeUserWithId,
    must,
    useTestDatabase,
    withToken,
} from "../helpers.js";

useTestDatabase();

const NEW_PASSWORD = "clave-nueva-789";
const OTHER_PASSWORD = "otra-clave-999";

describe("Autenticación", () => {
    let ownerToken: string;
    let storeId: number;
    let counter = 0;

    beforeAll(async () => {
        ownerToken = await createOwnerAndLogin();
        storeId = await makeStore(ownerToken, "Local de prueba");
    });

    // Un empleado nuevo para cada prueba
    const newEmployee = () => makeUserWithId(ownerToken, `empleado${++counter}@test.com`, "employee", [storeId]);

    const loginAs = (email: string, password: string) => http().post("/api/auth/login").send({ email, password });

    const me = (token: string) => http().get("/api/auth/me").set(withToken(token));

    const changePassword = (token: string, currentPassword: string, newPassword: string) =>
        http().post("/api/auth/change-password").set(withToken(token)).send({ currentPassword, newPassword });

    describe("iniciar sesión", () => {
        it("con las credenciales correctas devuelve el token y el usuario, sin datos internos", async () => {
            const res = await loginAs(OWNER.email, OWNER.password);

            expect(res.status).toBe(200);
            expect(res.body.token).toEqual(expect.any(String));
            expect(res.body.user).toMatchObject({ email: OWNER.email, role: "owner", isActive: true });
            expect(res.body.user).not.toHaveProperty("passwordHash");
            expect(res.body.user).not.toHaveProperty("tokenVersion");
        });

        it("el email se normaliza: los espacios y las mayúsculas no importan (caso límite)", async () => {
            const res = await loginAs(`  ${OWNER.email.toUpperCase()}  `, OWNER.password);

            expect(res.status).toBe(200);
        });

        it("una contraseña incorrecta y un email inexistente responden lo mismo, para no revelar qué emails existen", async () => {
            const wrongPassword = await loginAs(OWNER.email, OTHER_PASSWORD);
            const unknownEmail = await loginAs("nadie@test.com", OTHER_PASSWORD);

            expect(wrongPassword.status).toBe(401);
            expect(unknownEmail.status).toBe(401);
            expect(wrongPassword.body.msg).toContain("Email o contraseña incorrectos");
            expect(unknownEmail.body.msg).toBe(wrongPassword.body.msg);
        });

        it("un usuario desactivado recibe 403, pero solo si la contraseña era correcta", async () => {
            const employee = await newEmployee();
            const deactivate = await http()
                .patch(`/api/users/${employee.id}`)
                .set(withToken(ownerToken))
                .send({ isActive: false });
            must(deactivate, 200, "Desactivar al empleado");

            const correct = await loginAs(employee.email, USER_PASSWORD);
            const wrong = await loginAs(employee.email, OTHER_PASSWORD);

            expect(correct.status).toBe(403);
            expect(wrong.status).toBe(401);
        });

        it("sin email ni contraseña responde 400", async () => {
            const res = await http().post("/api/auth/login").send({});

            expect(res.status).toBe(400);
            expect(res.body.msg).toContain("Datos de petición inválidos");
        });
    });

    describe("sesiones", () => {
        it("sin token responde 401", async () => {
            const res = await http().get("/api/auth/me");

            expect(res.status).toBe(401);
            expect(res.body.msg).toContain("Autenticación requerida");
        });

        it("con un token inválido responde 401", async () => {
            const res = await me("esto-no-es-un-token");

            expect(res.status).toBe(401);
        });

        it("el token da acceso al usuario de la sesión, sin datos internos", async () => {
            const employee = await newEmployee();

            const res = await me(employee.token);

            expect(res.status).toBe(200);
            expect(JSON.stringify(res.body)).toContain(employee.email);
            expect(JSON.stringify(res.body)).not.toContain("passwordHash");
        });

        it("desactivar a un usuario cierra su sesión de inmediato (el usuario se consulta en cada pedido)", async () => {
            const employee = await newEmployee();
            expect((await me(employee.token)).status).toBe(200);

            const deactivate = await http()
                .patch(`/api/users/${employee.id}`)
                .set(withToken(ownerToken))
                .send({ isActive: false });
            must(deactivate, 200, "Desactivar al empleado");

            expect((await me(employee.token)).status).toBe(401);
        });
    });

    describe("cambiar la contraseña", () => {
        it("cambia la contraseña, cierra las otras sesiones y devuelve un token nuevo", async () => {
            const employee = await newEmployee();
            const secondSession = await loginAs(employee.email, USER_PASSWORD);
            const secondToken = secondSession.body.token as string;

            const res = await changePassword(employee.token, USER_PASSWORD, NEW_PASSWORD);

            expect(res.status).toBe(200);
            const newToken = res.body.token as string;
            expect((await me(employee.token)).status).toBe(401);
            expect((await me(secondToken)).status).toBe(401);
            expect((await me(newToken)).status).toBe(200);
            expect((await loginAs(employee.email, USER_PASSWORD)).status).toBe(401);
            expect((await loginAs(employee.email, NEW_PASSWORD)).status).toBe(200);
        });

        it("rechaza una contraseña actual incorrecta, una nueva igual a la actual y una que no cumple las reglas", async () => {
            const employee = await newEmployee();

            const wrongCurrent = await changePassword(employee.token, OTHER_PASSWORD, NEW_PASSWORD);
            const samePassword = await changePassword(employee.token, USER_PASSWORD, USER_PASSWORD);
            const weak = await changePassword(employee.token, USER_PASSWORD, "123");

            expect(wrongCurrent.status).toBe(400);
            expect(wrongCurrent.body.msg).toContain("La contraseña actual es incorrecta");
            expect(samePassword.status).toBe(400);
            expect(samePassword.body.msg).toContain("distinta de la actual");
            expect(weak.status).toBe(400);
            expect(weak.body.msg).toContain("Datos de petición inválidos");
            // Ninguno de los tres cambió nada: la sesión y la contraseña siguen valiendo
            expect((await me(employee.token)).status).toBe(200);
            expect((await loginAs(employee.email, USER_PASSWORD)).status).toBe(200);
        });

        it("sin sesión responde 401", async () => {
            const res = await http()
                .post("/api/auth/change-password")
                .send({ currentPassword: USER_PASSWORD, newPassword: NEW_PASSWORD });

            expect(res.status).toBe(401);
        });
    });

    describe("límite de intentos fallidos", () => {
        it("bloquea el login tras demasiados intentos fallidos con el mismo email", async () => {
            const email = "bloqueado@test.com";

            for (let attempt = 1; attempt <= env.LOGIN_MAX_ATTEMPTS; attempt++) {
                expect((await loginAs(email, OTHER_PASSWORD)).status).toBe(401);
            }

            const blocked = await loginAs(email, OTHER_PASSWORD);
            expect(blocked.status).toBe(429);
            expect(blocked.body.msg).toContain("Demasiados intentos");
            expect(blocked.headers["retry-after"]).toBeDefined();
            // El mismo email escrito distinto cuenta como el mismo
            expect((await loginAs("  BLOQUEADO@test.com ", OTHER_PASSWORD)).status).toBe(429);
        });

        it("no afecta a otros emails ni a quien inicia sesión bien (caso límite)", async () => {
            expect((await loginAs("otro-email@test.com", OTHER_PASSWORD)).status).toBe(401);
            expect((await loginAs(OWNER.email, OWNER.password)).status).toBe(200);
        });

        it("bloquea el cambio de contraseña tras demasiados intentos fallidos del mismo usuario", async () => {
            const employee = await newEmployee();

            for (let attempt = 1; attempt <= env.CHANGE_PASSWORD_MAX_ATTEMPTS; attempt++) {
                expect((await changePassword(employee.token, OTHER_PASSWORD, NEW_PASSWORD)).status).toBe(400);
            }

            // Bloqueado: ni siquiera con la contraseña actual correcta
            const blocked = await changePassword(employee.token, USER_PASSWORD, NEW_PASSWORD);
            expect(blocked.status).toBe(429);
            expect(blocked.body.msg).toContain("Demasiados intentos");
            // Iniciar sesión es otro límite: sigue funcionando
            expect((await loginAs(employee.email, USER_PASSWORD)).status).toBe(200);
        });
    });
});