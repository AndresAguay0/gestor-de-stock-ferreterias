import type { Request, Response } from "express";
import type { SettingsService } from "./settings.service.js";

export class SettingsController {
    constructor(private readonly service: SettingsService) {}

    get = async (_req: Request, res: Response) => {
        res.json(await this.service.get());
    };

    update = async (req: Request, res: Response) => {
        res.json(await this.service.update(req.body));
    };
}