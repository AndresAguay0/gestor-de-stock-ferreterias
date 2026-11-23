import { Router, type RequestHandler } from "express";
import { validate } from "../../shared/validate.js";
import type { ReservationController } from "./reservation.controller.js";
import { createReservationSchema } from "./reservation.schema.js";

export const createReservationRouter = (controller: ReservationController, authenticate: RequestHandler) => {
    const router = Router();

    router.use(authenticate);

    router.post("/", validate(createReservationSchema), controller.create);
    router.get("/", controller.list);
    router.get("/:id", controller.getById);
    router.post("/:id/pickup", controller.pickup);
    router.post("/:id/cancel", controller.cancel);

    return router;
};