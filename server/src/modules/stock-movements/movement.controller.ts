import type { Request, Response } from "express";
import { getAuthUser } from "../../shared/auth.js";
import { parseOrThrow } from "../../shared/validate.js";
import { listMovementsQuerySchema } from "./movement.schema.js";
import type { MovementService } from "./movement.service.js";

export class MovementController {
    constructor(private readonly service: MovementService) {}

    register = async (req: Request, res: Response) => {
        res.status(201).json(await this.service.register(getAuthUser(req), req.body));
    };

    list = async (req: Request, res: Response) => {
        const query = parseOrThrow(listMovementsQuerySchema, req.query);
        res.json(await this.service.list(getAuthUser(req), query));
    };
}