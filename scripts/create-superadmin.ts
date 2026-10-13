// Crea (o resetea la contraseña de) el superadmin de una instalación. Solo por consola: el superadmin
// no se puede crear desde la web.
//
//   npm run superadmin -- <email> "<nombre>"        (pide la contraseña por la variable SUPERADMIN_PASSWORD
//                                                   o la genera y la muestra una sola vez)
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { ensureSystemRoles } from "@/modules/core/seed";

async function main() {
  const [emailArg, nameArg] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error('Uso: npm run superadmin -- <email> "<nombre>"');
    process.exit(1);
  }
  const generated = !process.env.SUPERADMIN_PASSWORD;
  const password = process.env.SUPERADMIN_PASSWORD ?? randomBytes(12).toString("base64url");
  if (password.length < 10) {
    console.error("La contraseña tiene que tener al menos 10 caracteres.");
    process.exit(1);
  }

  await ensureSystemRoles(db);
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.upsert({
    where: { email },
    create: { email, name: nameArg?.trim() || "Soporte", passwordHash, isSuperadmin: true },
    update: { passwordHash, isSuperadmin: true, active: true },
  });
  console.log(`Superadmin listo: ${user.email}`);
  if (generated) console.log(`Contraseña generada (guardala, no se vuelve a mostrar): ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
