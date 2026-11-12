import { StoreController } from "./modules/stores/store.controller.js";
import { StoreRepository } from "./modules/stores/store.repository.js";
import { StoreService } from "./modules/stores/store.service.js";

const storeRepository = new StoreRepository();
const storeService = new StoreService(storeRepository);

export const storeController = new StoreController(storeService);