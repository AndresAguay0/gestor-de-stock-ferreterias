import type { Request, Response } from "express";
import { parseId } from "../../shared/parseId.js";
import { parseOrThrow } from "../../shared/validate.js";
import { listStoresQuerySchema } from "./store.schema.js";
import type { StoreService } from "./store.service.js";

export class StoreController {
    constructor(private readonly service: StoreService) {}

    list = async (req: Request, res: Response) => {
        const query = parseOrThrow(listStoresQuerySchema, req.query);
        res.json(await this.service.list(query));
    };

    getById = async (req: Request, res: Response) => {
        res.json(await this.service.getById(parseId(req.params.id)));
    };

    create = async (req: Request, res: Response) => {
        const store = await this.service.create(req.body);
        res.status(201).json(store);
    };

    update = async (req: Request, res: Response) => {
        res.json(await this.service.update(parseId(req.params.id), req.body));
    };
}