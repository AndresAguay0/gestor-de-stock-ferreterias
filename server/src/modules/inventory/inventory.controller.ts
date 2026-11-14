import type { Request, Response } from "express";
import { getAuthUser } from "../../shared/auth.js";
import { parseId } from "../../shared/parseId.js";
import { parseOrThrow } from "../../shared/validate.js";
import { listInventoryQuerySchema } from "./inventory.schema.js";
import type { InventoryService } from "./inventory.service.js";

export class InventoryController {
    constructor(private readonly service: InventoryService) {}

    list = async (req: Request, res: Response) => {
        const query = parseOrThrow(listInventoryQuerySchema, req.query);
        res.json(await this.service.list(getAuthUser(req), query));
    };

    getByProduct = async (req: Request, res: Response) => {
        res.json(await this.service.getByProduct(getAuthUser(req), parseId(req.params.productId, "productId")));
    };

    setMinQuantity = async (req: Request, res: Response) => {
        const stock = await this.service.setMinQuantity(
            getAuthUser(req),
            parseId(req.params.productId, "productId"),
            parseId(req.params.storeId, "storeId"),
            req.body.minQuantity,
        );
        res.json(stock);
    };
}