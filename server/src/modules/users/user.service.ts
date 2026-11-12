import type { Transaction } from "sequelize";
import type { TransactionRunner } from "../../db/transaction.js";
import { AppError } from "../../shared/AppError.js";
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

    list(query: ListUsersQuery) {
        return this.users.findAll({ includeInactive: query.includeInactive });
    }

    getById(id: number) {
        return this.findOrFail(id);
    }

    async create(input: CreateUserInput) {
        const passwordHash = await hashPassword(input.password);

        return this.db.run(async (tx) => {
            await this.assertEmailAvailable(input.email, undefined, tx);
            await this.assertStoresAssignable(input.storeIds, tx);

            const user = await this.users.create({ email: input.email, passwordHash, role: input.role}, tx);
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