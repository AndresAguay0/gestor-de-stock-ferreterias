import { AppError } from "../../shared/AppError.js";
import type { StoreRepository } from "./store.repository.js";
import type { CreateStoreInput, ListStoresQuery, UpdateStoreInput } from "./store.schema.js";

export class StoreService {
    constructor(private readonly stores: StoreRepository) {}

    list(query: ListStoresQuery) {
        return this.stores.findAll({ includeInactive: query.includeInactive });
    }

    async getById(id: number) {
        const store = await this.stores.findById(id);
        if (!store) throw new AppError(404, "Ferretería no encontrada");
        return store;
    }

    create(input: CreateStoreInput) {
        return this.stores.create(input);
    }

    async update(id: number, input: UpdateStoreInput) {
        const store = await this.stores.update(id, input);
        if (!store) throw new AppError(404, "Ferretería no encontrada");
        return store;
    }
}