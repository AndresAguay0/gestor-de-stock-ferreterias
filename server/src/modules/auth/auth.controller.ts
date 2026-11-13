import type { Request, Response } from "express";
import { getAuthUser } from "../../shared/auth.js";
import type { AuthService } from "./auth.service.js";

export class AuthController {
    constructor(private readonly service: AuthService) {}

    login = async (req: Request, res: Response) => {
        res.json(await this.service.login(req.body));
    };

    me = async (req: Request, res: Response) => {
        res.json(await this.service.me(getAuthUser(req).id));
    };

    changePassword = async (req: Request, res: Response) => {
        res.json(await this.service.changePassword(getAuthUser(req).id, req.body));
    };
}