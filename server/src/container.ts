import { TransactionRunner } from "./db/transaction.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { StoreController } from "./modules/stores/store.controller.js";
import { StoreRepository } from "./modules/stores/store.repository.js";
import { StoreService } from "./modules/stores/store.service.js";
import { UserController } from "./modules/users/user.controller.js";
import { UserRepository } from "./modules/users/user.repository.js";
import { UserService } from "./modules/users/user.service.js";
import { createAuthenticate } from "./shared/auth.js";

const transactionRunner = new TransactionRunner();
const userRepository = new UserRepository();
const storeRepository = new StoreRepository();

const authService = new AuthService(userRepository);
const storeService = new StoreService(storeRepository);
const userService = new UserService(userRepository, storeRepository, transactionRunner);

export const authenticate = createAuthenticate(userRepository);
export const authController = new AuthController(authService);
export const storeController = new StoreController(storeService);
export const userController = new UserController(userService);