import { beforeAll, describe, expect, it } from "vitest";
import { createOwnerAndLogin, http, makeStore, makeUser, useTestDatabase, withToken } from "../helpers.js";

useTestDatabase();

describe("Locales", () => {
    let ownerToken: string;
    let managerToken: string;
    let employeeToken: string;
    let storeA: number;

    beforeAll(async () => {
        ownerToken = await createOwnerAndLogin();
        storeA = await makeStore(ownerToken, "Local A");
        managerToken = await makeUser(ownerToken, "gerente@test.com", "manager", [storeA]);
        employeeToken = await makeUser(ownerToken, "empleado@test.com", "employee", [storeA]);
    });

    const createStore = (token: string, body: Record<string, unknown>) =>
        http().post("/api/stores").set(withToken(token)).send(body);

    const updateStore = (token: string, id: number, body: Record<string, unknown>) =>
        http().patch(`/api/stores/${id}`).set(withToken(token)).send(body);

    const listStores = (token: string, includeInactive?: boolean) =>
        http()
            .get("/api/stores")
            .query(includeInactive === undefined ? {} : { includeInactive })
            .set(withToken(token));

    const idsOf = (res: { body: { id: number }[] }) => res.body.map((store) => store.id);

    describe("permisos", () => {
        it("sin sesión responde 401", async () => {
            const res = await http().get("/api/stores");

            expect(res.status).toBe(401);
            expect(res.body.msg).toContain("Autenticación requerida");
        });

        it("cualquier usuario con sesión ve los locales", async () => {
            for (const token of [employeeToken, managerToken, ownerToken]) {
                const list = await listStores(token);
                expect(list.status).toBe(200);
                expect(idsOf(list)).toContain(storeA);
            }

            const one = await http().get(`/api/stores/${storeA}`).set(withToken(employeeToken));
            expect(one.status).toBe(200);
            expect(one.body.name).toBe("Local A");
        });

        it("solo el dueño crea y edita locales: el empleado y el gerente reciben 403 y no cambia nada", async () => {
            for (const token of [employeeToken, managerToken]) {
                const created = await createStore(token, { name: "Local nuevo", address: "Calle 1" });
                expect(created.status).toBe(403);
                expect(created.body.msg).toContain("No tenés permiso");

                const edited = await updateStore(token, storeA, { name: "Otro nombre" });
                expect(edited.status).toBe(403);
            }

            const unchanged = await http().get(`/api/stores/${storeA}`).set(withToken(ownerToken));
            expect(unchanged.body.name).toBe("Local A");
        });
    });

    describe("crear y editar", () => {
        it("el dueño crea un local, que queda activo (caso normal)", async () => {
            const res = await createStore(ownerToken, { name: "Local Norte", address: "Calle Norte 123" });

            expect(res.status).toBe(201);
            expect(res.body).toMatchObject({ name: "Local Norte", address: "Calle Norte 123", isActive: true });
            expect(res.body.id).toEqual(expect.any(Number));
        });

        it("recorta los espacios y descarta los campos que no corresponden (caso límite)", async () => {
            const res = await createStore(ownerToken, {
                name: "  Local con espacios  ",
                address: "  Calle 1  ",
                isActive: false,
                id: 9999,
            });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe("Local con espacios");
            expect(res.body.address).toBe("Calle 1");
            expect(res.body.isActive).toBe(true);
            expect(res.body.id).not.toBe(9999);
        });

        const invalidBodies: [string, Record<string, unknown>, string][] = [
            ["un nombre vacío", { name: "", address: "Calle 1" }, "No puede estar vacío"],
            ["un nombre de más de 100 caracteres", { name: "x".repeat(101), address: "Calle 1" }, "Máximo 100 caracteres"],
            ["una dirección de más de 255 caracteres", { name: "Local", address: "x".repeat(256) }, "Máximo 255 caracteres"],
            ["un pedido sin dirección", { name: "Local" }, "Datos de petición inválidos"],
        ];

        it.each(invalidBodies)("rechaza %s (error 400)", async (_case, body, message) => {
            const res = await createStore(ownerToken, body);

            expect(res.status).toBe(400);
            expect(JSON.stringify(res.body)).toContain(message);
        });

        it("editar cambia solo los campos enviados, y un cuerpo vacío se rechaza", async () => {
            const id = await makeStore(ownerToken, "Local para editar");

            const renamed = await updateStore(ownerToken, id, { name: "Local renombrado" });
            expect(renamed.status).toBe(200);
            expect(renamed.body).toMatchObject({ name: "Local renombrado", address: "Calle de prueba" });

            const empty = await updateStore(ownerToken, id, {});
            expect(empty.status).toBe(400);
            expect(JSON.stringify(empty.body)).toContain("al menos un campo");
        });

        it("un id inexistente responde 404 y uno que no es un número responde 400", async () => {
            const missing = await http().get("/api/stores/999999").set(withToken(ownerToken));
            expect(missing.status).toBe(404);
            expect(missing.body.msg).toContain("Ferretería no encontrada");

            const invalid = await http().get("/api/stores/abc").set(withToken(ownerToken));
            expect(invalid.status).toBe(400);
        });
    });

    describe("locales desactivados", () => {
        it("un local desactivado solo lo ven el gerente y el dueño, y solo si lo piden", async () => {
            const closed = await makeStore(ownerToken, "Local cerrado");
            const off = await updateStore(ownerToken, closed, { isActive: false });
            expect(off.status).toBe(200);
            expect(off.body.isActive).toBe(false);

            expect(idsOf(await listStores(employeeToken))).not.toContain(closed);
            expect(idsOf(await listStores(employeeToken, true))).not.toContain(closed);
            const employeeById = await http().get(`/api/stores/${closed}`).set(withToken(employeeToken));
            expect(employeeById.status).toBe(404);
            expect(employeeById.body.msg).toContain("Ferretería no encontrada");

            for (const token of [managerToken, ownerToken]) {
                expect(idsOf(await listStores(token))).not.toContain(closed);
                expect(idsOf(await listStores(token, true))).toContain(closed);
            }
            const managerById = await http().get(`/api/stores/${closed}`).set(withToken(managerToken));
            expect(managerById.status).toBe(200);
        });
    });
});