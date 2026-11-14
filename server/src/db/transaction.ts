import { Transaction } from "sequelize";
import sequelize from "../config/database.js";

export class TransactionRunner {
    run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
        return sequelize.transaction(work);
    }

    runExclusive<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
        return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, work);
    }
}