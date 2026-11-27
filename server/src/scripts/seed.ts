import sequelize from "../config/database.js";
import { migrator } from "../db/umzug.js";
import {
    HardwareStore,
    Inventory,
    Notification,
    Product,
    Reservation,
    Setting,
    StockMovement,
    User,
    UserStore,
} from "../models/index.js";
import { hashPassword } from "../shared/password.js";

const run = async () => {
    await migrator.up();

    const passwordHash = await hashPassword("Prueba123!");

    // Locales
    const [localCentro] = await HardwareStore.findOrCreate({
        where: { name: "Local Centro" },
        defaults: {
            name: "Local Centro",
            address: "Av. Principal 123",
            isActive: true,
        },
    });

    const [localNorte] = await HardwareStore.findOrCreate({
        where: { name: "Local Norte" },
        defaults: {
            name: "Local Norte",
            address: "Calle Norte 456",
            isActive: true,
        },
    });

    // Usuarios de prueba
    const [owner] = await User.findOrCreate({
        where: { email: "dueno@prueba.com" },
        defaults: {
            email: "dueno@prueba.com",
            passwordHash,
            role: "owner",
            isActive: true,
        },
    });

    const [manager] = await User.findOrCreate({
        where: { email: "gerente@prueba.com" },
        defaults: {
            email: "gerente@prueba.com",
            passwordHash,
            role: "manager",
            isActive: true,
        },
    });

    const [employee] = await User.findOrCreate({
        where: { email: "empleado@prueba.com" },
        defaults: {
            email: "empleado@prueba.com",
            passwordHash,
            role: "employee",
            isActive: true,
        },
    });

    await UserStore.findOrCreate({
        where: {
            userId: manager.id,
            hardwareStoreId: localCentro.id,
        },
        defaults: {
            userId: manager.id,
            hardwareStoreId: localCentro.id,
        },
    });

    await UserStore.findOrCreate({
        where: {
            userId: employee.id,
            hardwareStoreId: localCentro.id,
        },
        defaults: {
            userId: employee.id,
            hardwareStoreId: localCentro.id,
        },
    });

    // Productos
    const productsData = [
        {
            name: "Tornillos 8 mm",
            category: "Fijaciones",
            unit: "caja" as const,
            priceCents: 2500,
            sku: "PRUEBA-TORNILLOS",
        },
        {
            name: "Martillo",
            category: "Herramientas",
            unit: "un" as const,
            priceCents: 8500,
            sku: "PRUEBA-MARTILLO",
        },
        {
            name: "Cable eléctrico",
            category: "Electricidad",
            unit: "m" as const,
            priceCents: 1200,
            sku: "PRUEBA-CABLE",
        },
    ];

    const products: Product[] = [];

    for (const data of productsData) {
        const [product] = await Product.findOrCreate({
            where: { sku: data.sku },
            defaults: {
                ...data,
                description: `Producto de prueba: ${data.name}`,
                isActive: true,
            },
        });

        products.push(product);
    }

    const [tornillos, martillo, cable] = products;

    // Inventario inicial en ambos locales.
    // Las cantidades se guardan en unidades internas: 1000 = 1 unidad.
    const inventories = [
        { product: tornillos, store: localCentro, quantity: 20_000, minQuantity: 5_000 },
        { product: tornillos, store: localNorte, quantity: 8_000, minQuantity: 3_000 },
        { product: martillo, store: localCentro, quantity: 2_000, minQuantity: 5_000 },
        { product: martillo, store: localNorte, quantity: 12_000, minQuantity: 3_000 },
        { product: cable, store: localCentro, quantity: 50_000, minQuantity: 10_000 },
        { product: cable, store: localNorte, quantity: 15_000, minQuantity: 5_000 },
    ];

    for (const item of inventories) {
        await Inventory.findOrCreate({
            where: {
                productId: item.product.id,
                hardwareStoreId: item.store.id,
            },
            defaults: {
                productId: item.product.id,
                hardwareStoreId: item.store.id,
                quantity: item.quantity,
                minQuantity: item.minQuantity,
            },
        });
    }

    // Movimiento de ejemplo
    await StockMovement.findOrCreate({
        where: { clientRef: "SEED-MOVEMENT-001" },
        defaults: {
            productId: tornillos.id,
            hardwareStoreId: localCentro.id,
            userId: manager.id,
            type: "in",
            reason: "purchase",
            quantity: 5_000,
            resultingQuantity: 20_000,
            note: "Movimiento de prueba creado por el seeder",
            clientRef: "SEED-MOVEMENT-001",
        },
    });

    // Reserva activa de prueba: 2 cajas de tornillos en el Local Centro.
    await Reservation.findOrCreate({
        where: {
            createdByUserId: employee.id,
            customerNote: "SEED-RESERVATION-001",
        },
        defaults: {
            productId: tornillos.id,
            hardwareStoreId: localCentro.id,
            originStoreId: null,
            quantity: 2,
            createdByUserId: employee.id,
            customerNote: "SEED-RESERVATION-001",
            status: "active",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            resolvedAt: null,
            resolvedByUserId: null,
            movementId: null,
        },
    });

    // Notificación de stock bajo para el martillo.
    await Notification.findOrCreate({
        where: {
            userId: manager.id,
            productId: martillo.id,
            hardwareStoreId: localCentro.id,
            type: "low_stock",
        },
        defaults: {
            userId: manager.id,
            productId: martillo.id,
            hardwareStoreId: localCentro.id,
            type: "low_stock",
            quantity: 2_000,
            minQuantity: 5_000,
            readAt: null,
        },
    });

    await Setting.findOrCreate({
        where: { id: 1 },
        defaults: {
            id: 1,
            businessName: "Ferretería de prueba",
            reservationDefaultMinutes: 120,
        },
    });

    console.log("Seeder ejecutado.");
    console.log("Usuarios:");
    console.log("  Dueño:    dueno@prueba.com");
    console.log("  Gerente:  gerente@prueba.com");
    console.log("  Empleado: empleado@prueba.com");
    console.log("Contraseña para los tres: Prueba123!");
};

run()
    .catch((error: unknown) => {
        console.error("Error ejecutando el seeder:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await sequelize.close();
    });