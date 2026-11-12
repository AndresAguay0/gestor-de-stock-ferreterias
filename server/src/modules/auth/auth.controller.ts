import type { Request, Response } from "express";
import type { AuthService } from "./auth.service.js";

export class AuthController {
    constructor(private readonly service: AuthService) {}

    login = async (req: Request, res: Response) => {
        res.json(await this.service.login(req.body));
    };
}