import { Transaction } from "sequelize";
import sequelize from "../config/database.js";

const serialize = sequelize.getDialect() === "sqlite";

// Cola que se usa para ordenar la ejecucion de las transacciones
let queue: Promise<unknown> = Promise.resolve();

// Ejecuta las tareas respetando la cola de transacciones
const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    if (!serialize) return task();

    const result = queue.then(task);

    // Mantiene la cola disponible para las siguientes tareas aunque una transaccion falle
    queue = result.catch(() => undefined);

    return result;
};

export class TransactionRunner {
    // Ejecuta una operacion dentro de una transaccion
    run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
        return enqueue(() => sequelize.transaction(work));
    }

    // Hace lo mismo pero en una transaccion IMMEDIATE
    runExclusive<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
        return enqueue(() => sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, work));
    }
}

// Espera a que se completen todas las transacciones pendientes
export const waitForPendingTransactions = () => queue.then(() => undefined);