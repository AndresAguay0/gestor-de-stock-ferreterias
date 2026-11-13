import sequelize from "../config/database.js";
import { migrator } from "../db/umzug.js";
import { UserRepository } from "../modules/users/user.repository.js";
import { emailSchema, passwordSchema } from "../modules/users/user.schema.js";
import { hashPassword } from "../shared/password.js";
import { createPrompt } from "./prompt.js";

const prompt = createPrompt();

const run = async () => {
    await migrator.up();

    const email = emailSchema.safeParse(await prompt.ask("Email del dueño: "));
    if (!email.success) throw new Error(email.error.issues[0]?.message ?? "Email inválido");

    const users = new UserRepository();
    if (await users.existsByEmail(email.data)) throw new Error("Ya existe un usuario con ese email");

    const password = passwordSchema.safeParse(await prompt.askHidden("Contraseña (mínimo 8 caracteres): "));
    if (!password.success) throw new Error(password.error.issues[0]?.message ?? "Contraseña inválida");

    const repeated = await prompt.askHidden("Repetí la contraseña: ");
    if (repeated !== password.data) throw new Error("Las contraseñas no coinciden");

    const owner = await users.create({
        email: email.data,
        passwordHash: await hashPassword(password.data),
        role: "owner",
    });

    console.log(`Dueño creado: ${owner.email} (id ${owner.id})`);
};

run()
    .catch((error: unknown) => {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        prompt.close();
        await sequelize.close();
    });