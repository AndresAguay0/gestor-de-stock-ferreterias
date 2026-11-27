import { beforeAll, describe, expect, it } from "vitest";
import { UserRepository } from "../../src/modules/users/user.repository.js";
import { hashPassword } from "../../src/shared/password.js";
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

type TestUser = Awaited<ReturnType<typeof makeUserWithId>>;

describe("Usuarios", () => {
    let ownerToken: string;
    let storeA: number;
    let storeB: number;
    let managerA: TestUser;
    let managerAB: TestUser;
    let managerB: TestUser;
    let employeeA: TestUser;
    let employeeB: TestUser;
    let otherOwnerId: number;
    let counter = 0;

    // Tres gerentes (del local A, de A y B, y de B), un empleado en cada local y un segundo dueño
    beforeAll(async () => {
        ownerToken = await createOwnerAndLogin();
        storeA = await makeStore(ownerToken, "Local A");
        storeB = await makeStore(ownerToken, "Local B");
        managerA = await makeUserWithId(ownerToken, "gerente-a@test.com", "manager", [storeA]);
        managerAB = await makeUserWithId(ownerToken, "gerente-ab@test.com", "manager", [storeA, storeB]);
        managerB = await makeUserWithId(ownerToken, "gerente-b@test.com", "manager", [storeB]);
        employeeA = await makeUserWithId(ownerToken, "empleado-a@test.com", "employee", [storeA]);
        employeeB = await makeUserWithId(ownerToken, "empleado-b@test.com", "employee", [storeB]);
        // Los dueños no se crean por la API: se crea directo en la base
        const otherOwner = await new UserRepository().create({
            email: "otro-dueno@test.com",
            passwordHash: await hashPassword(USER_PASSWORD),
            role: "owner",
        });
        otherOwnerId = otherOwner.id;
    });

    const newUser = (role: "manager" | "employee", storeIds: number[]) =>
        makeUserWithId(ownerToken, `${role}${++counter}@test.com`, role, storeIds);

    const createUser = (token: string, body: Record<string, unknown>) =>
        http().post("/api/users").set(withToken(token)).send({ password: USER_PASSWORD, ...body });

    const getUser = (token: string, id: number) => http().get(`/api/users/${id}`).set(withToken(token));

    const listUsers = (token: string, query: Record<string, string | boolean> = {}) =>
        http().get("/api/users").query(query).set(withToken(token));

    const updateUser = (token: string, id: number, body: Record<string, unknown>) =>
        http().patch(`/api/users/${id}`).set(withToken(token)).send(body);

    const reassign = (token: string, id: number, storeIds: number[]) =>
        http().patch(`/api/users/${id}/stores`).set(withToken(token)).send({ storeIds });

    const resetPassword = (token: string, id: number, newPassword: string) =>
        http().put(`/api/users/${id}/password`).set(withToken(token)).send({ newPassword });

    const loginAs = (email: string, password: string) => http().post("/api/auth/login").send({ email, password });

    const storesOf = (res: { body: { stores: { id: number }[] } }) =>
        res.body.stores.map((store) => store.id).sort((a, b) => a - b);

    describe("quién ve a quién", () => {
        it("sin sesión responde 401 y un empleado no puede ver usuarios (403)", async () => {
            expect((await http().get("/api/users")).status).toBe(401);

            const forbidden = await listUsers(employeeA.token);
            expect(forbidden.status).toBe(403);
            expect(forbidden.body.msg).toContain("No tenés permiso");
        });

        it("un gerente ve solo a los empleados activos de sus locales", async () => {
            const res = await listUsers(managerA.token);
            const text = JSON.stringify(res.body);

            expect(res.status).toBe(200);
            expect(text).toContain(employeeA.email);
            expect(text).not.toContain(employeeB.email); // empleado de otro local
            expect(text).not.toContain(managerAB.email); // otro gerente
            expect(text).not.toContain(OWNER.email); // el dueño
        });

        it("el dueño ve a todos", async () => {
            const text = JSON.stringify((await listUsers(ownerToken)).body);

            for (const email of [OWNER.email, managerA.email, managerAB.email, employeeA.email, employeeB.email]) {
                expect(text).toContain(email);
            }
        });

        it("un gerente solo ve el detalle de los empleados de sus locales: el resto responde 404", async () => {
            expect((await getUser(managerA.token, employeeA.id)).status).toBe(200);
            expect((await getUser(managerA.token, employeeB.id)).status).toBe(404);
            expect((await getUser(managerA.token, 999999)).status).toBe(404);
        });

        it("el detalle trae los locales del usuario, sin datos internos", async () => {
            const res = await getUser(ownerToken, managerAB.id);

            expect(res.status).toBe(200);
            expect(storesOf(res)).toEqual([storeA, storeB]);
            expect(JSON.stringify(res.body)).not.toContain("passwordHash");
            expect(JSON.stringify(res.body)).not.toContain("tokenVersion");
        });

        it("un usuario desactivado sale del listado, salvo que el dueño pida los desactivados", async () => {
            const employee = await newUser("employee", [storeA]);
            must(await updateUser(ownerToken, employee.id, { isActive: false }), 200, "Desactivar al empleado");

            expect(JSON.stringify((await listUsers(ownerToken)).body)).not.toContain(employee.email);
            expect(JSON.stringify((await listUsers(ownerToken, { includeInactive: true })).body)).toContain(employee.email);
            // Para un gerente el parámetro no tiene efecto
            expect(JSON.stringify((await listUsers(managerA.token, { includeInactive: true })).body)).not.toContain(
                employee.email,
            );
        });
    });

    describe("crear usuarios", () => {
        it("solo el dueño crea usuarios: el gerente y el empleado reciben 403", async () => {
            for (const token of [managerA.token, employeeA.token]) {
                const res = await createUser(token, { email: "no-deberia@test.com", role: "employee", storeIds: [storeA] });
                expect(res.status).toBe(403);
            }
            expect((await loginAs("no-deberia@test.com", USER_PASSWORD)).status).toBe(401);
        });

        it("crea un empleado y un gerente con sus locales, y guarda el email en minúsculas (caso normal y límite)", async () => {
            const employee = await createUser(ownerToken, { email: "NUEVO@Test.com", role: "employee", storeIds: [storeA] });
            expect(employee.status).toBe(201);
            expect(employee.body).toMatchObject({ email: "nuevo@test.com", role: "employee", isActive: true });
            expect(JSON.stringify(employee.body)).not.toContain("passwordHash");
            expect(storesOf(await getUser(ownerToken, employee.body.id))).toEqual([storeA]);

            const manager = await createUser(ownerToken, {
                email: "nuevo-gerente@test.com",
                role: "manager",
                storeIds: [storeA, storeB],
            });
            expect(manager.status).toBe(201);
            expect(storesOf(await getUser(ownerToken, manager.body.id))).toEqual([storeA, storeB]);

            expect((await loginAs("nuevo@test.com", USER_PASSWORD)).status).toBe(200);
        });

        it("rechaza un email que ya existe (error 409)", async () => {
            const res = await createUser(ownerToken, { email: employeeA.email, role: "employee", storeIds: [storeA] });

            expect(res.status).toBe(409);
            expect(res.body.msg).toContain("Ya existe un usuario con ese email");
        });

        it("rechaza datos inválidos (error 400)", async () => {
            const cases: [string, Record<string, unknown>, string][] = [
                [
                    "el rol de dueño (los dueños no se crean por la API)",
                    { email: "x1@test.com", role: "owner", storeIds: [storeA] },
                    "Datos de petición inválidos",
                ],
                [
                    "un empleado con dos locales",
                    { email: "x2@test.com", role: "employee", storeIds: [storeA, storeB] },
                    "exactamente un local",
                ],
                ["un usuario sin locales", { email: "x3@test.com", role: "manager", storeIds: [] }, "Asigná al menos un local"],
                [
                    "locales repetidos",
                    { email: "x4@test.com", role: "manager", storeIds: [storeA, storeA] },
                    "No puede haber locales repetidos",
                ],
                [
                    "una contraseña corta",
                    { email: "x5@test.com", role: "employee", storeIds: [storeA], password: "1234567" },
                    "Debe tener al menos 8 caracteres",
                ],
                ["un email inválido", { email: "no-es-un-email", role: "employee", storeIds: [storeA] }, "Email inválido"],
            ];

            for (const [name, body, message] of cases) {
                const res = await createUser(ownerToken, body);
                expect(res.status, name).toBe(400);
                expect(JSON.stringify(res.body), name).toContain(message);
            }
        });

        it("no se puede asignar a un usuario a un local desactivado (error 400)", async () => {
            const closed = await makeStore(ownerToken, "Local cerrado");
            const off = await http().patch(`/api/stores/${closed}`).set(withToken(ownerToken)).send({ isActive: false });
            must(off, 200, "Desactivar el local");

            const res = await createUser(ownerToken, { email: "en-local-cerrado@test.com", role: "employee", storeIds: [closed] });

            expect(res.status).toBe(400);
        });
    });

    describe("editar usuarios", () => {
        it("solo el dueño edita usuarios: el gerente recibe 403 y no cambia nada", async () => {
            const res = await updateUser(managerA.token, employeeA.id, { isActive: false });

            expect(res.status).toBe(403);
            expect((await getUser(ownerToken, employeeA.id)).body.isActive).toBe(true);
        });

        it("el dueño cambia el email, y uno que ya existe se rechaza (error 409)", async () => {
            const employee = await newUser("employee", [storeA]);
            const newEmail = `cambiado${employee.id}@test.com`;

            const changed = await updateUser(ownerToken, employee.id, { email: newEmail });
            expect(changed.status).toBe(200);
            expect(changed.body.email).toBe(newEmail);

            expect((await updateUser(ownerToken, employee.id, { email: employeeA.email })).status).toBe(409);
        });

        it("cambiarle el rol tiene efecto inmediato en su sesión, sin volver a iniciar sesión", async () => {
            const employee = await newUser("employee", [storeA]);
            expect((await listUsers(employee.token)).status).toBe(403);

            must(await updateUser(ownerToken, employee.id, { role: "manager" }), 200, "Ascender al empleado");

            expect((await listUsers(employee.token)).status).toBe(200);
        });

        it("un empleado no puede quedar con más de un local, y un cuerpo vacío se rechaza (error 400)", async () => {
            const employee = await newUser("employee", [storeA]);

            expect((await updateUser(ownerToken, employee.id, { storeIds: [storeA, storeB] })).status).toBe(400);
            expect((await updateUser(ownerToken, employee.id, {})).status).toBe(400);
        });

        it("un dueño no se puede modificar por la API (403)", async () => {
            const res = await updateUser(ownerToken, otherOwnerId, { isActive: false });

            expect(res.status).toBe(403);
        });
    });

    describe("reasignar locales", () => {
        it("un gerente mueve a un empleado suyo a otro de sus locales", async () => {
            const employee = await newUser("employee", [storeA]);

            const res = await reassign(managerAB.token, employee.id, [storeB]);

            expect(res.status).toBe(200);
            expect(storesOf(await getUser(ownerToken, employee.id))).toEqual([storeB]);
        });

        it("un gerente no puede mandar a un empleado a un local que no es suyo (403)", async () => {
            const employee = await newUser("employee", [storeA]);

            const res = await reassign(managerA.token, employee.id, [storeB]);

            expect(res.status).toBe(403);
            expect(storesOf(await getUser(ownerToken, employee.id))).toEqual([storeA]);
        });

        it("un gerente no puede tocar a un empleado de un local que no es suyo (404)", async () => {
            const employee = await newUser("employee", [storeA]);

            const res = await reassign(managerB.token, employee.id, [storeB]);

            expect(res.status).toBe(404);
        });

        it("un empleado queda en exactamente un local (error 400)", async () => {
            const employee = await newUser("employee", [storeA]);

            const res = await reassign(managerAB.token, employee.id, [storeA, storeB]);

            expect(res.status).toBe(400);
        });

        it("el dueño le asigna varios locales a un gerente", async () => {
            const manager = await newUser("manager", [storeA]);

            const res = await reassign(ownerToken, manager.id, [storeA, storeB]);

            expect(res.status).toBe(200);
            expect(storesOf(await getUser(ownerToken, manager.id))).toEqual([storeA, storeB]);
        });

        it("un empleado no puede reasignar a nadie (403)", async () => {
            const res = await reassign(employeeA.token, employeeB.id, [storeA]);

            expect(res.status).toBe(403);
        });
    });

    describe("resetear contraseñas", () => {
        it("el dueño resetea la contraseña: responde 204, cierra las sesiones de esa persona y la nueva sirve", async () => {
            const employee = await newUser("employee", [storeA]);

            const res = await resetPassword(ownerToken, employee.id, "clave-reseteada-1");

            expect(res.status).toBe(204);
            expect((await http().get("/api/auth/me").set(withToken(employee.token))).status).toBe(401);
            expect((await loginAs(employee.email, USER_PASSWORD)).status).toBe(401);
            expect((await loginAs(employee.email, "clave-reseteada-1")).status).toBe(200);
        });

        it("los gerentes y los empleados no pueden resetear contraseñas (403)", async () => {
            for (const token of [managerA.token, employeeB.token]) {
                const res = await resetPassword(token, employeeA.id, "clave-reseteada-2");
                expect(res.status).toBe(403);
                expect(res.body.msg).toContain("No tenés permiso");
            }
            // La contraseña de ese empleado no cambió
            expect((await loginAs(employeeA.email, USER_PASSWORD)).status).toBe(200);
        });

        it("la contraseña de un dueño no se resetea por la API (403)", async () => {
            const res = await resetPassword(ownerToken, otherOwnerId, "clave-reseteada-3");

            expect(res.status).toBe(403);
            expect(res.body.msg).toContain("Los dueños no se pueden modificar");
        });

        it("un usuario que no existe responde 404, y una contraseña débil se rechaza (error 400)", async () => {
            const missing = await resetPassword(ownerToken, 999999, "clave-reseteada-4");
            expect(missing.status).toBe(404);
            expect(missing.body.msg).toContain("Usuario no encontrado");

            const weak = await resetPassword(ownerToken, employeeA.id, "123");
            expect(weak.status).toBe(400);
            expect(weak.body.msg).toContain("Datos de petición inválidos");
        });
    });
});