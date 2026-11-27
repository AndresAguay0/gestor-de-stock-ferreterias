import { beforeAll, describe, expect, it } from "vitest";
import {
    createOwnerAndLogin,
    http,
    makeProduct,
    makeStore,
    makeUser,
    must,
    useTestDatabase,
    withToken,
} from "../helpers.js";

useTestDatabase();

describe("Movimientos de stock", () => {
    let ownerToken: string;
    let managerToken: string;
    let employeeToken: string;
    let storeA: number;
    let storeB: number;

    // Un dueño, un gerente y un empleado del local A, y un local B donde ellos no tienen acceso
    beforeAll(async () => {
        ownerToken = await createOwnerAndLogin();
        storeA = await makeStore(ownerToken, "Local A");
        storeB = await makeStore(ownerToken, "Local B");
        managerToken = await makeUser(ownerToken, "gerente@test.com", "manager", [storeA]);
        employeeToken = await makeUser(ownerToken, "empleado@test.com", "employee", [storeA]);
    });

    const move = (token: string, body: Record<string, unknown>) =>
        http().post("/api/movements").set(withToken(token)).send(body);

    // El empleado del local A registra un ingreso o una venta
    const income = (productId: number, quantity: number, extra: Record<string, unknown> = {}) =>
        move(employeeToken, { productId, storeId: storeA, type: "in", reason: "purchase", quantity, ...extra });
    const sale = (productId: number, quantity: number) =>
        move(employeeToken, { productId, storeId: storeA, type: "out", reason: "sale", quantity });

    // Stock actual de un producto en un local, leido del inventario
    const stockOf = async (productId: number, storeId: number) => {
        const res = await http().get(`/api/inventory/${productId}`).set(withToken(employeeToken));
        must(res, 200, "Consultar el inventario");
        return res.body.stores.find((store: { storeId: number }) => store.storeId === storeId).quantity as number;
    };

    describe("casos normales", () => {
        it("un ingreso suma al stock y queda registrado", async () => {
            const cable = await makeProduct(ownerToken, "Cable ingreso", "m");

            const res = await income(cable, 12.5);

            expect(res.status).toBe(201);
            expect(res.body.movement).toMatchObject({ type: "in", quantity: 12.5, resultingQuantity: 12.5 });
            expect(res.body.stock.negativeStock).toBe(false);
            expect(await stockOf(cable, storeA)).toBe(12.5);
        });

        it("un egreso resta: el movimiento guarda la variación con signo negativo", async () => {
            const cable = await makeProduct(ownerToken, "Cable egreso", "m");
            await income(cable, 12.5);

            const res = await sale(cable, 3);

            expect(res.status).toBe(201);
            expect(res.body.movement).toMatchObject({ type: "out", quantity: -3, resultingQuantity: 9.5 });
        });
    });

    describe("casos límite", () => {
        it("vender más de lo que hay se registra igual y avisa que el stock quedó negativo", async () => {
            const tornillo = await makeProduct(ownerToken, "Tornillo negativo", "un");
            await income(tornillo, 2);

            const res = await sale(tornillo, 5);

            expect(res.status).toBe(201);
            expect(res.body.movement.resultingQuantity).toBe(-3);
            expect(res.body.stock).toMatchObject({ negativeStock: true, belowMinimum: true });
            expect(await stockOf(tornillo, storeA)).toBe(-3);
        });

        it("un recuento fija el stock contado y guarda la diferencia, también cuando es 0", async () => {
            const tornillo = await makeProduct(ownerToken, "Tornillo recuento", "un");
            await income(tornillo, 5);
            const recount = { productId: tornillo, storeId: storeA, type: "adjustment", reason: "count", countedQuantity: 8 };

            const first = await move(managerToken, recount);
            expect(first.status).toBe(201);
            expect(first.body.movement).toMatchObject({ quantity: 3, resultingQuantity: 8 });

            const second = await move(managerToken, recount);
            expect(second.status).toBe(201);
            expect(second.body.movement).toMatchObject({ quantity: 0, resultingQuantity: 8 });
        });

        it("la misma referencia (clientRef) no se aplica dos veces", async () => {
            const tornillo = await makeProduct(ownerToken, "Tornillo referencia", "un");

            const first = await income(tornillo, 4, { clientRef: "ref-doble-clic" });
            const second = await income(tornillo, 4, { clientRef: "ref-doble-clic" });

            expect(first.status).toBe(201);
            expect(second.status).toBe(409);
            expect(await stockOf(tornillo, storeA)).toBe(4);
        });

        it("diez ingresos simultáneos se registran todos, sin pisarse", async () => {
            const tornillo = await makeProduct(ownerToken, "Tornillo simultáneo", "un");

            const responses = await Promise.all(Array.from({ length: 10 }, () => income(tornillo, 1)));

            expect(responses.map((res) => res.status)).toEqual(Array(10).fill(201));
            expect(await stockOf(tornillo, storeA)).toBe(10);
        });
    });

    describe("errores", () => {
        it("sin sesión responde 401", async () => {
            const res = await http()
                .post("/api/movements")
                .send({ productId: 1, storeId: storeA, type: "in", reason: "purchase", quantity: 1 });

            expect(res.status).toBe(401);
            expect(res.body.msg).toContain("Autenticación requerida");
        });

        it("un empleado no puede hacer ajustes (403)", async () => {
            const tornillo = await makeProduct(ownerToken, "Tornillo ajuste", "un");

            const res = await move(employeeToken, {
                productId: tornillo,
                storeId: storeA,
                type: "adjustment",
                reason: "count",
                countedQuantity: 1,
            });

            expect(res.status).toBe(403);
            expect(res.body.msg).toContain("ajustes");
        });

        it("un empleado no opera en un local que no es suyo (403)", async () => {
            const tornillo = await makeProduct(ownerToken, "Tornillo local ajeno", "un");

            const res = await move(employeeToken, {
                productId: tornillo,
                storeId: storeB,
                type: "in",
                reason: "purchase",
                quantity: 1,
            });

            expect(res.status).toBe(403);
            expect(res.body.msg).toContain("No tenés acceso a ese local");
        });

        it("una cantidad con más decimales de los que admite la unidad se rechaza y no cambia el stock", async () => {
            const tornillo = await makeProduct(ownerToken, "Tornillo decimales", "un");
            const cable = await makeProduct(ownerToken, "Cable decimales", "m");
            await income(tornillo, 1);

            const unidades = await income(tornillo, 2.5);
            const metros = await income(cable, 2.555);

            expect(unidades.status).toBe(400);
            expect(unidades.body.msg).toContain("no admite decimales");
            expect(metros.status).toBe(400);
            expect(metros.body.msg).toContain("admite hasta 2 decimales");
            expect(await stockOf(tornillo, storeA)).toBe(1);
        });

        it("una cantidad en 0 se rechaza (400)", async () => {
            const tornillo = await makeProduct(ownerToken, "Tornillo cero", "un");

            const res = await income(tornillo, 0);

            expect(res.status).toBe(400);
            expect(JSON.stringify(res.body)).toContain("Tiene que ser mayor que 0");
        });
    });
});