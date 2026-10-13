// Datos de demostración para DESARROLLO: una empresa, dos sucursales con su depósito y dos usuarios.
// Se niega a correr en producción. Idempotente.
//
//   npm run db:seed:dev
import bcrypt from "bcryptjs";
import { db } from "./db";
import { ensureSystemRoles } from "@/modules/core/seed";
import { cuitCheckDigit } from "@/modules/core/cuit";

const DEV_PASSWORD = "udex-demo-1234";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("seed-dev no se corre en producción");
  await ensureSystemRoles(db);

  const cuit = `3071234567${cuitCheckDigit("3071234567")}`;
  const company = await db.company.upsert({
    where: { cuit },
    create: { cuit, legalName: "Demo Comercial S.A.", tradeName: "Demo", ivaCondition: "responsable_inscripto" },
    update: {},
  });

  const branchesData = [
    { name: "Casa central", warehouse: "Depósito central" },
    { name: "Sucursal Norte", warehouse: "Depósito Norte" },
  ];
  const branches = [];
  for (const b of branchesData) {
    const branch = await db.branch.upsert({
      where: { companyId_name: { companyId: company.id, name: b.name } },
      create: { companyId: company.id, name: b.name },
      update: {},
    });
    await db.warehouse.upsert({
      where: { companyId_name: { companyId: company.id, name: b.warehouse } },
      create: { companyId: company.id, branchId: branch.id, name: b.warehouse, isBranchDefault: true },
      update: {},
    });
    branches.push(branch);
  }

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const users = [
    { email: "duenio@demo.local", name: "Dueña Demo", role: "owner", branchId: null },
    { email: "cajero@demo.local", name: "Cajero Norte", role: "cashier", branchId: branches[1].id },
  ];
  for (const u of users) {
    const user = await db.user.upsert({
      where: { email: u.email },
      create: { email: u.email, name: u.name, passwordHash },
      update: {},
    });
    const role = await db.role.findUniqueOrThrow({ where: { key: u.role } });
    const exists = await db.membership.findFirst({ where: { userId: user.id, companyId: company.id, branchId: u.branchId } });
    if (!exists) {
      await db.membership.create({ data: { userId: user.id, companyId: company.id, branchId: u.branchId, roleId: role.id } });
    }
  }

  console.log(`Empresa demo: ${company.legalName} (${cuit})`);
  console.log(`Usuarios: ${users.map((u) => u.email).join(", ")} · contraseña: ${DEV_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
