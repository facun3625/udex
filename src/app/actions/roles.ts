"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission, requireWritable } from "@/modules/core/context";
import { audit } from "@/modules/core/audit";
import { cleanPermissions, roleKeyFromName } from "@/modules/core/rules";

export type RoleFormState = { error?: string; saved?: boolean };

const nameSchema = z.object({ name: z.string().trim().min(1, "Falta el nombre") });

export async function createRoleAction(_prev: RoleFormState, form: FormData): Promise<RoleFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "users.manage");
  requireWritable(ctx);

  const parsed = nameSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const permissions = cleanPermissions(form.getAll("permissions").map(String));

  let key = roleKeyFromName(parsed.data.name);
  let suffix = 2;
  while (await prisma.role.findUnique({ where: { key } })) key = `${roleKeyFromName(parsed.data.name)}-${suffix++}`;

  const role = await prisma.role.create({ data: { key, name: parsed.data.name, permissions, isSystem: false } });
  await audit({ companyId: ctx.companyId, user: ctx.user }, { action: "role.create", targetType: "role", targetId: role.id, summary: `Rol creado: ${role.name}` });

  revalidatePath("/configuracion/roles");
  return { saved: true };
}

const editSchema = z.object({ roleId: z.string().min(1), name: z.string().trim().min(1, "Falta el nombre") });

export async function updateRoleAction(_prev: RoleFormState, form: FormData): Promise<RoleFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "users.manage");
  requireWritable(ctx);

  const parsed = editSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const role = await prisma.role.findUnique({ where: { id: parsed.data.roleId } });
  if (!role) return { error: "Rol inválido" };
  if (role.isSystem) return { error: "Los roles del sistema no se pueden editar" };

  const permissions = cleanPermissions(form.getAll("permissions").map(String));
  const before = { name: role.name, permissions: role.permissions };
  await prisma.role.update({ where: { id: role.id }, data: { name: parsed.data.name, permissions } });
  await audit(
    { companyId: ctx.companyId, user: ctx.user },
    { action: "role.update", targetType: "role", targetId: role.id, summary: `Rol editado: ${parsed.data.name}`, before, after: { name: parsed.data.name, permissions } },
  );

  revalidatePath("/configuracion/roles");
  return { saved: true };
}
