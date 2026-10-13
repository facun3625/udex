"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission, requireWritable } from "@/modules/core/context";
import { audit } from "@/modules/core/audit";
import { generatePassword, keepsPermission, limitReached } from "@/modules/core/rules";

export type UserFormState = { error?: string; saved?: boolean; generatedPassword?: string };

// branchId: "" = toda la empresa (todas las sucursales), o el id de una sucursal puntual.
const createSchema = z.object({
  name: z.string().trim().min(1, "Falta el nombre"),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  roleId: z.string().min(1, "Elegí un rol"),
  branchId: z.string().optional(),
});

export async function createUserAction(_prev: UserFormState, form: FormData): Promise<UserFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "users.manage");
  requireWritable(ctx);

  const parsed = createSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const { name, email, roleId } = parsed.data;
  const branchId = parsed.data.branchId || null;

  if (await prisma.user.findUnique({ where: { email } })) return { error: "Ya existe un usuario con ese email" };
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return { error: "Rol inválido" };
  if (branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || branch.companyId !== ctx.companyId) return { error: "Sucursal inválida" };
  }

  const maxUsers = ctx.license.limits.users;
  if (maxUsers !== null) {
    const current = await prisma.membership.findMany({ where: { companyId: ctx.companyId }, select: { userId: true }, distinct: ["userId"] });
    if (limitReached(maxUsers, current.length)) return { error: `Tu plan permite hasta ${maxUsers} usuarios.` };
  }

  const password = generatePassword((n) => randomBytes(n));
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { name, email, passwordHash } });
    await tx.membership.create({ data: { userId: created.id, companyId: ctx.companyId, branchId, roleId } });
    await audit(
      { companyId: ctx.companyId, user: ctx.user },
      { action: "user.create", targetType: "user", targetId: created.id, summary: `Usuario creado: ${email} (${role.name})` },
      tx,
    );
  });

  revalidatePath("/configuracion/usuarios");
  return { saved: true, generatedPassword: password };
}

const accessSchema = z.object({ userId: z.string().min(1), roleId: z.string().min(1), branchId: z.string().optional() });

export async function addAccessAction(_prev: UserFormState, form: FormData): Promise<UserFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "users.manage");
  requireWritable(ctx);

  const parsed = accessSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Datos inválidos" };
  const branchId = parsed.data.branchId || null;

  const [target, role] = await Promise.all([
    prisma.user.findUnique({ where: { id: parsed.data.userId } }),
    prisma.role.findUnique({ where: { id: parsed.data.roleId } }),
  ]);
  if (!target || !role) return { error: "Datos inválidos" };
  if (branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || branch.companyId !== ctx.companyId) return { error: "Sucursal inválida" };
  }

  // findFirst (no findUnique): Prisma no admite `null` en la clave compuesta del índice único aunque
  // la base sí (NULLS NOT DISTINCT) — ver docs/07-convenciones.md.
  const existing = await prisma.membership.findFirst({
    where: { userId: target.id, companyId: ctx.companyId, branchId },
  });
  if (existing) {
    await prisma.membership.update({ where: { id: existing.id }, data: { roleId: role.id } });
  } else {
    await prisma.membership.create({ data: { userId: target.id, companyId: ctx.companyId, branchId, roleId: role.id } });
  }
  await audit({ companyId: ctx.companyId, user: ctx.user }, { action: "user.access_add", targetType: "user", targetId: target.id, summary: `Acceso de ${target.email}: ${role.name}` });

  revalidatePath(`/configuracion/usuarios/${target.id}`);
  return { saved: true };
}

export async function removeAccessAction(form: FormData) {
  const ctx = await requireContext();
  requirePermission(ctx, "users.manage");
  requireWritable(ctx);

  const membershipId = String(form.get("membershipId") ?? "");
  const membership = await prisma.membership.findUnique({ where: { id: membershipId }, include: { role: true } });
  if (!membership || membership.companyId !== ctx.companyId) return;

  if (membership.userId === ctx.user.id) {
    const remaining = await prisma.membership.findMany({
      where: { userId: ctx.user.id, companyId: ctx.companyId, id: { not: membership.id } },
      include: { role: true },
    });
    const roleMap = new Map(remaining.map((m) => [m.roleId, m.role.permissions]));
    if (!keepsPermission(remaining.map((m) => ({ branchId: m.branchId, roleId: m.roleId })), roleMap, ctx.branchId, "users.manage")) {
      return; // te quedarías sin poder administrar usuarios en tu propia sucursal: no se permite
    }
  }

  await prisma.membership.delete({ where: { id: membership.id } });
  await audit({ companyId: ctx.companyId, user: ctx.user }, { action: "user.access_remove", targetType: "user", targetId: membership.userId, summary: `Acceso quitado (${membership.role.name})` });
  revalidatePath(`/configuracion/usuarios/${membership.userId}`);
}

export async function toggleUserActiveAction(form: FormData) {
  const ctx = await requireContext();
  requirePermission(ctx, "users.manage");
  requireWritable(ctx);

  const userId = String(form.get("userId") ?? "");
  if (userId === ctx.user.id) return; // no autodesactivarse
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  await prisma.user.update({ where: { id: userId }, data: { active: !target.active } });
  await audit({ companyId: ctx.companyId, user: ctx.user }, { action: target.active ? "user.deactivate" : "user.reactivate", targetType: "user", targetId: userId, summary: `${target.active ? "Desactivado" : "Reactivado"}: ${target.email}` });
  revalidatePath("/configuracion/usuarios");
  revalidatePath(`/configuracion/usuarios/${userId}`);
}

export async function resetPasswordAction(_prev: UserFormState, form: FormData): Promise<UserFormState> {
  const ctx = await requireContext();
  requirePermission(ctx, "users.manage");
  requireWritable(ctx);

  const userId = String(form.get("userId") ?? "");
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Usuario inválido" };

  const password = generatePassword((n) => randomBytes(n));
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await audit({ companyId: ctx.companyId, user: ctx.user }, { action: "user.reset_password", targetType: "user", targetId: userId, summary: `Contraseña restablecida: ${target.email}` });

  return { saved: true, generatedPassword: password };
}

