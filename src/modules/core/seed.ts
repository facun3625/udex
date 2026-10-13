// Datos que toda instalación necesita para funcionar. Idempotente: se puede correr en cada deploy.
// Sin "server-only": lo usan también los scripts de consola (scripts/*.ts).
import type { PrismaClient } from "@/generated/prisma/client";
import { SYSTEM_ROLES } from "@/modules/core/permissions";

// Crea los roles de sistema y les actualiza los permisos (si una versión nueva agrega permisos, los
// roles de sistema los reciben solos). Los roles propios del cliente no se tocan.
export async function ensureSystemRoles(db: Pick<PrismaClient, "role">) {
  for (const r of SYSTEM_ROLES) {
    await db.role.upsert({
      where: { key: r.key },
      create: { key: r.key, name: r.name, description: r.description, permissions: r.permissions, isSystem: true },
      update: { name: r.name, description: r.description, permissions: r.permissions, isSystem: true },
    });
  }
}
