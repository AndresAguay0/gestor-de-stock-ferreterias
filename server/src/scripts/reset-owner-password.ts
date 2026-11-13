import sequelize from "../config/database.js";
import { migrator } from "../db/umzug.js";
import { UserRepository } from "../modules/users/user.repository.js";
import { emailSchema, passwordSchema } from "../modules/users/user.schema.js";
import { hashPassword } from "../shared/password.js";
import { createPrompt } from "./prompt.js";

const prompt = createPrompt();

const run = async () => {
    await migrator.up();
    const users = new UserRepository();

    const email = emailSchema.safeParse(await prompt.ask("email del dueño: "));
    if (!email.success) throw new Error(email.error.issues[0]?.message ?? "Email inválido");

    const owner = await users.findByEmail(email.data);
    if (!owner || owner.role !== "owner") {
        throw new Error("No hay ningun dueño con ese email");
    }

    const password = passwordSchema.safeParse(await prompt.askHidden("Contraseña nueva (mínimo 8 caracteres): "));
    if (!password.success) throw new Error(password.error.issues[0]?.message ?? "Contraseña inválida");

    const repeated = await prompt.askHidden("Repetí la contraseña: ");
    if (repeated !== password.data) throw new Error("Las contraseñas no coinciden");

    await users.setPassword(owner.id, await hashPassword(password.data));

    console.log(`Contraseña actualizada para ${owner.email}. Sus sesiones abiertas se cerraron.`)
};

run().catch((error: unknown) => {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
}).finally(async () => {
    prompt.close();
    await sequelize.close();
});