import type { Request, Response } from "express";
import { parseId } from "../../shared/parseId.js";
import { parseOrThrow } from "../../shared/validate.js";
import { listUsersQuerySchema } from "./user.schema.js";
import type { UserService } from "./user.service.js";

export class UserController {
    constructor(private readonly service: UserService) {}

    list = async (req: Request, res: Response) => {
        const query = parseOrThrow(listUsersQuerySchema, req.query);
        res.json(await this.service.list(query));
    };

    getById = async (req: Request, res: Response) => {
        res.json(await this.service.getById(parseId(req.params.id)));
    }

    create = async (req: Request, res: Response) => {
        const user = await this.service.create(req.body);
        res.status(201).json(user);
    };

    update = async (req: Request, res: Response) => {
        res.json(await this.service.update(parseId(req.params.id), req.body));
    };
}