import type { Transaction } from "sequelize";
import type { TransactionRunner } from "../../db/transaction.js";
import type { User } from "../../models/User.js";
import { AppError } from "../../shared/AppError.js";
import type { AuthUser } from "../../shared/auth.js";
import { hashPassword } from "../../shared/password.js";
import type { StoreRepository } from "../stores/store.repository.js";
import type { UserChanges, UserRepository } from "./user.repository.js";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "./user.schema.js";

export class UserService {
    constructor(
        private readonly users: UserRepository,
        private readonly stores: StoreRepository,
        private readonly db: TransactionRunner,
    ) {}

    list(actor: AuthUser, query: ListUsersQuery) {
        if (actor.role === "owner") {
            return this.users.findAll({ includeInactive: query.includeInactive });
        }

        return this.users.findActiveEmployeesInStore(actor.storeIds);
    }

    async getById(actor: AuthUser, id: number) {
        const user = await this.findOrFail(id);
        if (actor.role !== "owner" && !this.isInManagerScope(actor, user)) {
            throw new AppError(404, "Usuario no encontrado");
        }

        return user;
    }

    async create(input: CreateUserInput) {
        const passwordHash = await hashPassword(input.password);

        return this.db.run(async (tx) => {
            await this.assertEmailAvailable(input.email, undefined, tx);
            await this.assertStoresAssignable(input.storeIds, tx);

            const user = await this.users.create({ email: input.email, passwordHash, role: input.role }, tx);
            await this.users.replaceStores(user.id, input.storeIds, tx);

            return this.findOrFail(user.id, tx);
        });
    }

    update(id: number, input: UpdateUserInput) {
        return this.db.run(async (tx) => {
            const user = await this.findOrFail(id, tx);

            if (user.role === "owner") {
                throw new AppError(403, "Los dueños no se pueden modificar desde la API");
            }

            const finalRole = input.role ?? user.role;
            const currentStoreIds = (user.stores ?? []).map((store) => store.id);
            const finalStoreIds = input.storeIds ?? currentStoreIds;

            if (finalRole === "employee" && finalStoreIds.length !== 1) {
                throw new AppError(400, "Un empleado debe estar asignado a exactamente un local");
            }
            if (input.email !== undefined) {
                await this.assertEmailAvailable(input.email, id, tx);
            }
            if (input.storeIds !== undefined) {
                await this.assertStoresAssignable(input.storeIds, tx);
            }

            const changes: UserChanges = {};
            if (input.email !== undefined) changes.email = input.email;
            if (input.role !== undefined) changes.role = input.role;
            if (input.isActive !== undefined) changes.isActive = input.isActive;

            if (Object.keys(changes).length > 0) {
                await this.users.update(id, changes, tx);
            }
            if (input.storeIds !== undefined) {
                await this.users.replaceStores(id, input.storeIds, tx);
            }

            return this.findOrFail(id, tx);
        });
    }

    reassignStores(actor: AuthUser, targetId: number, storeIds: number[]) {
        if (actor.role === "owner") {
            return this.update(targetId, { storeIds });
        }

        return this.db.run(async (tx) => {
            const target = await this.findOrFail(targetId, tx);

            if (!this.isInManagerScope(actor, target)) {
                throw new AppError(404, "Usuario no encontrado");
            }
            if (storeIds.length !== 1) {
                throw new AppError(400, "Un empleado debe estar asignado a exactamente un local");
            }
            if (!storeIds.every((id) => actor.storeIds.includes(id))) {
                throw new AppError(403, "Solo podés asignar empleados a tus propios locales");
            }

            await this.assertStoresAssignable(storeIds, tx);
            await this.users.replaceStores(targetId, storeIds, tx);

            return this.findOrFail(targetId, tx);
        })
    }

    private isInManagerScope(actor: AuthUser, user: User) {
        return (
            user.role === "employee" &&
            user.isActive &&
            (user.stores ?? []).some((store) => actor.storeIds.includes(store.id))
        );
    }

    private async findOrFail(id: number, tx?: Transaction) {
        const user = await this.users.findById(id, tx);
        if (!user) throw new AppError(404, "Usuario no encontrado");
        return user;
    }

    private async assertEmailAvailable(email: string, excludeId: number | undefined, tx: Transaction) {
        if (await this.users.existsByEmail(email, excludeId, tx)) {
            throw new AppError(409, "Ya existe un usuario con ese email");
        }
    }

    private async assertStoresAssignable(storeIds: number[], tx: Transaction) {
        const found = await this.stores.findByIds(storeIds, tx);
        const available = new Set(found.filter((store) => store.isActive).map((store) => store.id));
        const invalid = storeIds.filter((id) => !available.has(id));

        if (invalid.length > 0) {
            throw new AppError(400, `Locales inexistentes o inactivos: ${invalid.join(", ")}`);
        }
    }
}