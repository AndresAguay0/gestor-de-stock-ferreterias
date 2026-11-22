import { TransactionRunner } from "./db/transaction.js";

import { AuthController } from "./modules/auth/auth.controller.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { createAuthenticate } from "./shared/auth.js";

import { SettingsController } from "./modules/settings/settings.controller.js";
import { SettingsRepository } from "./modules/settings/settings.repository.js";
import { SettingsService } from "./modules/settings/settings.service.js";

import { InventoryController } from "./modules/inventory/inventory.controller.js";
import { InventoryRepository } from "./modules/inventory/inventory.repository.js";
import { InventoryService } from "./modules/inventory/inventory.service.js";

import { ProductController } from "./modules/products/product.controller.js";
import { ProductRepository } from "./modules/products/product.repository.js";
import { ProductService } from "./modules/products/product.service.js";

import { ReservationRepository } from "./modules/reservations/reservation.repository.js";

import { MovementController } from "./modules/stock-movements/movement.controller.js";
import { MovementRepository } from "./modules/stock-movements/movement.repository.js";
import { MovementService } from "./modules/stock-movements/movement.service.js";

import { EventBus } from "./shared/events.js";

import { StoreController } from "./modules/stores/store.controller.js";
import { StoreRepository } from "./modules/stores/store.repository.js";
import { StoreService } from "./modules/stores/store.service.js";

import { UserController } from "./modules/users/user.controller.js";
import { UserRepository } from "./modules/users/user.repository.js";
import { UserService } from "./modules/users/user.service.js";

const transactionRunner = new TransactionRunner();
export const eventBus = new EventBus();
const userRepository = new UserRepository();
const storeRepository = new StoreRepository();
const productRepository = new ProductRepository();
const inventoryRepository = new InventoryRepository();
const movementRepository = new MovementRepository();
const settingsRepository = new SettingsRepository();
const reservationRepository = new ReservationRepository();

const authService = new AuthService(userRepository);
const storeService = new StoreService(storeRepository);
const userService = new UserService(userRepository, storeRepository, transactionRunner);
const productService = new ProductService(productRepository, transactionRunner);
const inventoryService = new InventoryService(inventoryRepository, productRepository, storeRepository, transactionRunner);
const movementService = new MovementService(movementRepository, inventoryRepository, productRepository, storeRepository, transactionRunner, eventBus, reservationRepository);
const settingsService = new SettingsService(settingsRepository, transactionRunner);

export const authenticate = createAuthenticate(userRepository);
export const authController = new AuthController(authService);
export const storeController = new StoreController(storeService);
export const userController = new UserController(userService);
export const productController = new ProductController(productService);
export const inventoryController = new InventoryController(inventoryService);
export const movementController = new MovementController(movementService);
export const settingsController = new SettingsController(settingsService);