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

import { NotificationController } from "./modules/notifications/notification.controller.js";
import { registerNotificationListeners } from "./modules/notifications/notification.listener.js";
import { NotificationRepository } from "./modules/notifications/notification.repository.js";
import { NotificationService } from "./modules/notifications/notification.service.js";

import { ProductController } from "./modules/products/product.controller.js";
import { ProductRepository } from "./modules/products/product.repository.js";
import { ProductService } from "./modules/products/product.service.js";

import { ReservationController } from "./modules/reservations/reservation.controller.js";
import { ReservationRepository } from "./modules/reservations/reservation.repository.js";
import { ReservationService } from "./modules/reservations/reservation.service.js";

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
const notificationRepository = new NotificationRepository();

const authService = new AuthService(userRepository);
const storeService = new StoreService(storeRepository);
const userService = new UserService(userRepository, storeRepository, transactionRunner);
const productService = new ProductService(productRepository, transactionRunner);
const inventoryService = new InventoryService(inventoryRepository, productRepository, storeRepository, transactionRunner, reservationRepository);
const movementService = new MovementService(movementRepository, inventoryRepository, productRepository, storeRepository, transactionRunner, eventBus, reservationRepository);
const reservationService = new ReservationService(reservationRepository, productRepository, storeRepository, inventoryRepository, settingsRepository, movementService, transactionRunner, eventBus);
const settingsService = new SettingsService(settingsRepository, transactionRunner);
const notificationService = new NotificationService(notificationRepository, userRepository, transactionRunner);

registerNotificationListeners(eventBus, notificationService);

export const authenticate = createAuthenticate(userRepository);
export const authController = new AuthController(authService);
export const storeController = new StoreController(storeService);
export const userController = new UserController(userService);
export const productController = new ProductController(productService);
export const inventoryController = new InventoryController(inventoryService);
export const movementController = new MovementController(movementService);
export const reservationController = new ReservationController(reservationService);
export const settingsController = new SettingsController(settingsService);
export const notificationController = new NotificationController(notificationService);