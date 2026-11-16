import { AppError } from "../../shared/AppError.js";
import { hashPassword, verifyPassword } from "../../shared/password.js";
import { signToken } from "../../shared/token.js";
import type { UserRepository } from "../users/user.repository.js";
import type { ChangePasswordInput ,LoginInput } from "./auth.schema.js";

const dummyHash = hashPassword("contraseña-de-relleno");

export class AuthService {
    constructor(private readonly users: UserRepository) {}

    async login(input: LoginInput) {
        const account = await this.users.findByEmailWithPassword(input.email);
        const hash = account?.getDataValue("passwordHash") ?? (await dummyHash);
        const passwordOk = await verifyPassword(input.password, hash);

        if (!account || !passwordOk) {
            throw new AppError(401, "Email o contraseña incorrectos");
        }
        if (!account.isActive) {
            throw new AppError(403, "Tu usuario está desactivado. Consultá con el dueño");
        }

        const user = await this.users.findById(account.id);
        return { token: await signToken(account.id, account.tokenVersion), user };
    }

    async me(userId: number) {
        const user = await this.users.findById(userId);
        if (!user) throw new AppError(401, "Sesión inválida o vencida");
        return user;
    }

    async changePassword(userId: number, input: ChangePasswordInput) {
        const account = await this.users.findByIdWithPassword(userId);
        if (!account) throw new AppError(401, "Sesión inválida o vencida");

        if (!(await verifyPassword(input.currentPassword, account.getDataValue("passwordHash")))) {
            throw new AppError(400, "La contraseña actual es incorrecta");
        }
        if (input.newPassword === input.currentPassword) {
            throw new AppError(400, "La nueva contraseña debe ser distinta de la actual");
        }

        const version = await this.users.setPassword(userId, await hashPassword(input.newPassword));
        if (version === null) throw new AppError(401, "Sesión inválida o vencida");

        return { token: await signToken(userId, version) };
    }
}