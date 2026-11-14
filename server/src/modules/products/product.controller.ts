import type { Request, Response } from "express";
import { getAuthUser } from "../../shared/auth.js";
import { parseId } from "../../shared/parseId.js";
import { parseOrThrow } from "../../shared/validate.js";
import { listProductsQuerySchema } from "./product.schema.js";
import type { ProductService } from "./product.service.js";

export class ProductController {
    constructor(private readonly service: ProductService) {}

    list = async (req: Request, res: Response) => {
        const query = parseOrThrow(listProductsQuerySchema, req.query);
        res.json(await this.service.list(getAuthUser(req), query));
    };

    getById = async (req: Request, res: Response) => {
        res.json(await this.service.getById(getAuthUser(req), parseId(req.params.id)));
    };

    create = async (req: Request, res: Response) => {
        res.status(201).json(await this.service.create(req.body))
    };

    update = async (req: Request, res: Response) => {
        res.json(await this.service.update(parseId(req.params.id), req.body));
    };
}