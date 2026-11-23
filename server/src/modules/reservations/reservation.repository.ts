import { col, fn, Op, type Includeable, type Transaction, type WhereOptions } from "sequelize";
import { HardwareStore } from "../../models/HardwareStore.js";
import { Product } from "../../models/Product.js";
import { Reservation, type ReservationState } from "../../models/Reservation.js";
import { User } from "../../models/User.js";

export interface NewReservationData {
    productId: number;
    hardwareStoreId: number;
    originStoreId?: number;
    quantity: number;
    createdByUserId: number;
    customerNote?: string;
    expiresAt: Date;
}

export interface ReservationScope {
    userId: number;
    storeIds: number[];
}

export interface ReservationFilters {
    status?: ReservationState;
    productId?: number;
    storeId?: number;
    scope?: ReservationScope;
    limit: number;
    offset: number;
}

export interface ReservedRow {
    productId: number;
    hardwareStoreId: number;
    reserved: number;
}

const activeAt = (now: Date): WhereOptions => ({ status: "active", expiresAt: { [Op.gt]: now } });

const INCLUDES: Includeable[] = [
    { model: Product, as: "product", attributes: ["id", "name", "unit"] },
    { model: HardwareStore, as: "store", attributes: ["id", "name"] },
    { model: HardwareStore, as: "originStore", attributes: ["id", "name"] },
    { model: User, as: "createdBy", attributes: ["id", "email"] },
    { model: User, as: "resolvedBy", attributes: ["id", "email"] },
];

export class ReservationRepository {
    create(data: NewReservationData, tx?: Transaction) {
        return Reservation.create(data, { transaction: tx });
    }

    findById(id: number, tx?: Transaction) {
        return Reservation.findByPk(id, { include: INCLUDES, transaction: tx });
    }

    async findAll(filters: ReservationFilters, now: Date, tx?: Transaction) {
        const conditions: WhereOptions[] = [];

        if (filters.status === "active") conditions.push(activeAt(now));
        else if (filters.status === "expired") conditions.push({ status: "active", expiresAt: { [Op.lte]: now } });
        else if (filters.status) conditions.push({ status: filters.status });

        if (filters.productId !== undefined) conditions.push({ productId: filters.productId });
        if (filters.storeId !== undefined) {
            conditions.push({ [Op.or]: [{ hardwareStoreId: filters.storeId }, { originStoreId: filters.storeId }] });
        }
        if (filters.scope) {
            const { userId, storeIds } = filters.scope;
            const visible: WhereOptions[] = [{ createdByUserId: userId }];
            if (storeIds.length > 0) visible.push({ hardwareStoreId: storeIds }, { originStoreId: storeIds });
            conditions.push({ [Op.or]: visible });
        }

        const { rows, count } = await Reservation.findAndCountAll({
            where: { [Op.and]: conditions },
            include: INCLUDES,
            order: [
                ["createdAt", "DESC"],
                ["id", "DESC"],
            ],
            limit: filters.limit,
            offset: filters.offset,
            transaction: tx,
        });

        return { items: rows, total: count };
    }

    async sumReserved(productId: number, hardwareStoreId: number, now: Date, tx?: Transaction) {
        const row = (await Reservation.findOne({
            attributes: [[fn("COALESCE", fn("SUM", col("quantity")), 0), "reserved"]],
            where: { [Op.and]: [{ productId, hardwareStoreId }, activeAt(now)] },
            raw: true,
            transaction: tx,
        })) as unknown as { reserved: number | string } | null;

        return Number(row?.reserved ?? 0);
    }

    async sumReservedByProducts(productIds: number[], now: Date, tx?: Transaction): Promise<ReservedRow[]> {
        if (productIds.length === 0) return [];

        const rows = (await Reservation.findAll({
            attributes: ["productId", "hardwareStoreId", [fn("SUM", col("quantity")), "reserved"]],
            where: { [Op.and]: [{ productId: productIds }, activeAt(now)] },
            group: ["productId", "hardwareStoreId"],
            raw: true,
            transaction: tx,
        })) as unknown as { productId: number; hardwareStoreId: number; reserved: number | string }[];

        return rows.map((row) => ({
            productId: row.productId,
            hardwareStoreId: row.hardwareStoreId,
            reserved: Number(row.reserved),
        }));
    }

    async resolve(id: number, status: "picked_up" | "cancelled", resolvedByUserId: number, now: Date, tx: Transaction) {
        await Reservation.update({ status, resolvedAt: now, resolvedByUserId }, { where: { id }, transaction: tx });
    }

    async setMovementId(id: number, movementId: number, tx: Transaction) {
        await Reservation.update({ movementId }, { where: { id }, transaction: tx });
    }
}