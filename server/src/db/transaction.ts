import { Transaction } from "sequelize";
import sequelize from "../config/database.js";

const serialize = sequelize.getDialect() === "sqlite";
let queue: Promise<unknown> = Promise.resolve();

const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    if (!serialize) return task();

    const result = queue.then(task);
    queue = result.catch(() => undefined);
    return result;
};

export class TransactionRunner {
    run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
        return enqueue(() => sequelize.transaction(work));
    }

    runExclusive<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
        return enqueue(() => sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, work));
    }
}