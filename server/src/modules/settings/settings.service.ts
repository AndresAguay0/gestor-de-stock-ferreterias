import type { TransactionRunner } from "../../db/transaction.js";
import type { Setting } from "../../models/Setting.js";
import type { SettingsChanges, SettingsRepository } from "./settings.repository.js";
import type { UpdateSettingsInput } from "./settings.schema.js";

export class SettingsService {
    constructor(
        private readonly settings: SettingsRepository,
        private readonly db: TransactionRunner,
    ) {}

    async get() {
        return this.view(await this.settings.get());
    }

    update(input: UpdateSettingsInput) {
        return this.db.run(async (tx) => {
            const changes: SettingsChanges = {};
            if (input.businessName !== undefined) changes.businessName = input.businessName;
            if (input.reservationDefaultMinutes !== undefined) {
                changes.reservationDefaultMinutes = input.reservationDefaultMinutes;
            }

            return this.view(await this.settings.update(changes, tx));
        });
    }

    private view(setting: Setting) {
        return {
            businessName: setting.businessName ?? null,
            reservationDefaultMinutes: setting.reservationDefaultMinutes,
        };
    }
}