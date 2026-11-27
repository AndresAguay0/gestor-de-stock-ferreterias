import { beforeAll, describe, expect, it } from "vitest";
import { createOwnerAndLogin, http, makeStore, makeUser, useTestDatabase, withToken } from "../helpers.js";

useTestDatabase();

describe("Productos", () => {
    let ownerToken: string;
    let managerToken: string;
    let employeeToken: string;

    beforeAll(async () => {
        ownerToken = await createOwnerAndLogin();
        const store = await makeStore(ownerToken, "Local A");
        managerToken = await makeUser(ownerToken, "gerente@test.com", "manager", [store]);
        employeeToken = await makeUser(ownerToken, "empleado@test.com", "employee", [store]);
    });

    const createProduct = (token: string, body: Record<string, unknown>) =>
        http()
            .post("/api/products")
            .set(withToken(token))
            .send({ category: "General", unit: "un", priceCents: 1000, ...body });

    const updateProduct = (token: string, id: number, body: Record<string, unknown>) =>
        http().patch(`/api/products/${id}`).set(withToken(token)).send(body);

    const listProducts = (token: string, query: Record<string, string | number | boolean>) =>
        http().get("/api/products").query(query).set(withToken(token));

    describe("permisos", () => {
        it("sin sesión responde 401", async () => {
            const res = await http().get("/api/products");

            expect(res.status).toBe(401);
        });

        it("el empleado ve el catálogo, pero no crea ni edita productos (403)", async () => {
            const created = await createProduct(managerToken, { name: "Producto del catálogo" });
            const id = created.body.id as number;

            const list = await listProducts(employeeToken, { search: "Producto del catálogo" });
            expect(list.status).toBe(200);
            expect(list.body.total).toBe(1);
            expect((await http().get(`/api/products/${id}`).set(withToken(employeeToken))).status).toBe(200);

            const forbiddenCreate = await createProduct(employeeToken, { name: "No debería crearse" });
            expect(forbiddenCreate.status).toBe(403);
            expect(forbiddenCreate.body.msg).toContain("No tenés permiso");
            expect((await updateProduct(employeeToken, id, { priceCents: 1 })).status).toBe(403);
        });

        it("el gerente crea y edita productos", async () => {
            const created = await createProduct(managerToken, { name: "Producto del gerente" });
            expect(created.status).toBe(201);

            const edited = await updateProduct(managerToken, created.body.id, { priceCents: 2500 });
            expect(edited.status).toBe(200);
            expect(edited.body.priceCents).toBe(2500);
        });
    });

    describe("crear", () => {
        it("guarda todos los datos y pone el SKU en mayúsculas (caso normal)", async () => {
            const res = await createProduct(managerToken, {
                name: "Cable de cobre",
                description: "Cable de 2,5 mm",
                category: "Electricidad",
                unit: "m",
                priceCents: 1500,
                sku: "cab-123",
                barcode: "7790001112223",
            });

            expect(res.status).toBe(201);
            expect(res.body).toMatchObject({
                name: "Cable de cobre",
                category: "Electricidad",
                unit: "m",
                priceCents: 1500,
                sku: "CAB-123",
                barcode: "7790001112223",
                isActive: true,
            });
        });

        it("descarta los campos que no corresponden: no se puede crear desactivado ni elegir el id (caso límite)", async () => {
            const res = await createProduct(managerToken, { name: "Producto con extras", isActive: false, id: 9999 });

            expect(res.status).toBe(201);
            expect(res.body.isActive).toBe(true);
            expect(res.body.id).not.toBe(9999);
        });

        it("rechaza un SKU o un código de barras que ya existen, aunque el SKU se escriba en minúsculas (error 409)", async () => {
            await createProduct(managerToken, { name: "Producto original", sku: "dup-sku", barcode: "7791234567890" });

            const sameSku = await createProduct(managerToken, { name: "Mismo SKU", sku: "DUP-SKU" });
            const sameBarcode = await createProduct(managerToken, { name: "Mismo código", barcode: "7791234567890" });

            expect(sameSku.status).toBe(409);
            expect(sameBarcode.status).toBe(409);
        });

        const invalidBodies: [string, Record<string, unknown>, string][] = [
            ["una unidad que no existe", { unit: "kilo" }, "Datos de petición inválidos"],
            ["un precio negativo", { priceCents: -1 }, "No puede ser negativo"],
            ["un precio con decimales (se guarda en centavos enteros)", { priceCents: 10.5 }, "Tiene que ser un entero, en centavos"],
            ["un precio por encima del máximo", { priceCents: 2_000_000_001 }, "Es demasiado alto"],
            ["un nombre vacío", { name: "" }, "No puede estar vacío"],
        ];

        it.each(invalidBodies)("rechaza %s (error 400)", async (_case, change, message) => {
            const res = await createProduct(managerToken, { name: "Producto inválido", ...change });

            expect(res.status).toBe(400);
            expect(JSON.stringify(res.body)).toContain(message);
        });
    });

    describe("editar", () => {
        it("mandar null borra la descripción y el SKU", async () => {
            const created = await createProduct(managerToken, { name: "Con datos", description: "Algo", sku: "borrar-1" });

            const res = await updateProduct(managerToken, created.body.id, { description: null, sku: null, priceCents: 2000 });

            expect(res.status).toBe(200);
            expect(res.body.description).toBeNull();
            expect(res.body.sku).toBeNull();
            expect(res.body.priceCents).toBe(2000);
        });

        it("la unidad no se puede cambiar (error 400)", async () => {
            const created = await createProduct(managerToken, { name: "Con unidad", unit: "un" });

            const res = await updateProduct(managerToken, created.body.id, { unit: "kg" });

            expect(res.status).toBe(400);
            expect(JSON.stringify(res.body)).toContain("unidad");
        });

        it("un cuerpo vacío se rechaza, y un producto inexistente responde 404", async () => {
            const created = await createProduct(managerToken, { name: "Para editar" });

            const empty = await updateProduct(managerToken, created.body.id, {});
            expect(empty.status).toBe(400);
            expect(JSON.stringify(empty.body)).toContain("al menos un campo");

            expect((await updateProduct(managerToken, 999999, { priceCents: 1 })).status).toBe(404);
            expect((await http().get("/api/products/999999").set(withToken(managerToken))).status).toBe(404);
        });
    });

    describe("búsqueda y paginación", () => {
        beforeAll(async () => {
            await createProduct(managerToken, { name: "Martillo zeta carpintero", category: "ZetaHerramientas" });
            await createProduct(managerToken, { name: "Martillo zeta de goma", category: "ZetaHerramientas" });
            await createProduct(managerToken, {
                name: "Tornillo zeta largo",
                category: "ZetaFijaciones",
                sku: "zeta-tor-1",
                barcode: "7790000000011",
            });
        });

        it("la búsqueda va por palabras: todas tienen que aparecer, sin distinguir mayúsculas", async () => {
            expect((await listProducts(employeeToken, { search: "zeta" })).body.total).toBe(3);
            expect((await listProducts(employeeToken, { search: "MARTILLO zeta" })).body.total).toBe(2);

            const one = await listProducts(employeeToken, { search: "martillo carpintero" });
            expect(one.body.total).toBe(1);
            expect(one.body.items[0].name).toBe("Martillo zeta carpintero");
        });

        it("también busca por SKU", async () => {
            const res = await listProducts(employeeToken, { search: "zeta-tor-1" });

            expect(res.body.total).toBe(1);
            expect(res.body.items[0].name).toBe("Tornillo zeta largo");
        });

        it("el código de barras y la categoría son búsquedas exactas (caso límite)", async () => {
            expect((await listProducts(employeeToken, { barcode: "7790000000011" })).body.total).toBe(1);
            expect((await listProducts(employeeToken, { barcode: "779000000001" })).body.total).toBe(0);
            expect((await listProducts(employeeToken, { category: "ZetaHerramientas" })).body.total).toBe(2);
        });

        it("pagina con límite y desplazamiento, ordenado por nombre, y el total no cambia", async () => {
            const first = await listProducts(employeeToken, { category: "ZetaHerramientas", limit: 1 });
            expect(first.body).toMatchObject({ total: 2, limit: 1, offset: 0 });
            expect(first.body.items).toHaveLength(1);
            expect(first.body.items[0].name).toBe("Martillo zeta carpintero");

            const second = await listProducts(employeeToken, { category: "ZetaHerramientas", limit: 1, offset: 1 });
            expect(second.body.items[0].name).toBe("Martillo zeta de goma");
        });

        it("rechaza un límite fuera de rango y un desplazamiento negativo (error 400)", async () => {
            expect((await listProducts(employeeToken, { limit: 500 })).status).toBe(400);
            expect((await listProducts(employeeToken, { offset: -1 })).status).toBe(400);
        });
    });

    describe("productos dados de baja", () => {
        it("se ocultan a los empleados, pero el gerente los ve si los pide", async () => {
            const created = await createProduct(managerToken, { name: "Producto dado de baja" });
            const id = created.body.id as number;
            const off = await updateProduct(managerToken, id, { isActive: false });
            expect(off.status).toBe(200);
            expect(off.body.isActive).toBe(false);

            // El empleado no lo ve: por id responde 404 y includeInactive se ignora para él
            expect((await http().get(`/api/products/${id}`).set(withToken(employeeToken))).status).toBe(404);
            const employeeList = await listProducts(employeeToken, { search: "Producto dado de baja", includeInactive: true });
            expect(employeeList.body.total).toBe(0);

            // El gerente lo ve solo si lo pide
            const hidden = await listProducts(managerToken, { search: "Producto dado de baja" });
            expect(hidden.body.total).toBe(0);
            const shown = await listProducts(managerToken, { search: "Producto dado de baja", includeInactive: true });
            expect(shown.body.total).toBe(1);
            expect((await http().get(`/api/products/${id}`).set(withToken(managerToken))).status).toBe(200);
        });
    });
});