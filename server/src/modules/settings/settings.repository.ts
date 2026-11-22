import type { Transaction } from "sequelize";
import { Setting, SETTINGS_ID } from "../../models/Setting.js";

export interface SettingsChanges {
    businessName?: string | null;
    reservationDefaultMinutes?: number;
}

export class SettingsRepository {
    async get(tx?: Transaction) {
        const row = await Setting.findByPk(SETTINGS_ID, { transaction: tx });
        return row ?? Setting.create({ id: SETTINGS_ID }, { transaction: tx });
    }

    async update(changes: SettingsChanges, tx?: Transaction) {
        const row = await this.get(tx);
        return row.update(changes, { transaction: tx });
    }
}