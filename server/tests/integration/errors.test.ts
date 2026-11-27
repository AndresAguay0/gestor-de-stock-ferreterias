import { describe, expect, it } from "vitest";
import { http } from "../helpers.js";

describe("Errores y encabezados generales", () => {
    it("una ruta que no existe responde 404 con el formato de error de la API", async () => {
        const res = await http().get("/api/ruta-que-no-existe");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ msg: "Ruta no encontrada" });
    });

    it("un cuerpo que no es JSON válido responde 400", async () => {
        const res = await http().post("/api/auth/login").set("Content-Type", "application/json").send('{"email":');

        expect(res.status).toBe(400);
        expect(res.body.msg).toContain("no es un JSON válido");
    });

    it("la ruta de prueba es pública", async () => {
        const res = await http().get("/");

        expect(res.status).toBe(200);
    });

    it("las respuestas llevan los encabezados de seguridad y no anuncian que se usa Express", async () => {
        const res = await http().get("/");

        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(res.headers["x-powered-by"]).toBeUndefined();
    });

    it("los encabezados de seguridad también están en las respuestas de error", async () => {
        const res = await http().get("/api/ruta-que-no-existe");

        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(res.headers["x-powered-by"]).toBeUndefined();
    });
});