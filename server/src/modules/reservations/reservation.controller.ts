import type { Request, Response } from "express";
import { getAuthUser } from "../../shared/auth.js";
import { parseId } from "../../shared/parseId.js";
import { parseOrThrow } from "../../shared/validate.js";
import { listReservationsQuerySchema } from "./reservation.schema.js";
import type { ReservationService } from "./reservation.service.js";

export class ReservationController {
    constructor(private readonly service: ReservationService) {}
    
    create = async (req: Request, res: Response) => {
        res.status(201).json(await this.service.create(getAuthUser(req), req.body));
    };

    list = async (req: Request, res: Response) => {
        const query = parseOrThrow(listReservationsQuerySchema, req.query);
        res.json(await this.service.list(getAuthUser(req), query));
    };

    getById = async (req: Request, res: Response) => {
        res.json(await this.service.getById(getAuthUser(req), parseId(req.params.id)));
    };

    pickup = async (req: Request, res: Response) => {
        res.json(await this.service.pickup(getAuthUser(req), parseId(req.params.id)));
    };

    cancel = async (req: Request, res: Response) => {
        res.json(await this.service.cancel(getAuthUser(req), parseId(req.params.id)));
    };
}