"use server";

import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser, SCOPE_COOKIE } from "@/modules/core/context";
import { accessibleBranches } from "@/modules/core/scope";

export type LoginState = { error?: string };

// Solo se aceptan destinos internos ("/stock?x=1"), nunca una URL externa.
function safeNext(raw: FormDataEntryValue | null): string {
  const next = typeof raw === "string" ? raw : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirectTo: safeNext(form.get("next")),
    });
  } catch (e) {
    // signIn redirige tirando una excepción de Next: esa hay que dejarla pasar.
    if (e instanceof AuthError) return { error: "Email o contraseña incorrectos (o demasiados intentos: esperá 15 minutos)." };
    throw e;
  }
  return {};
}

export async function logoutAction() {
  (await cookies()).delete(SCOPE_COOKIE);
  await signOut({ redirectTo: "/login" });
}

export async function selectBranchAction(form: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const branchId = String(form.get("branchId") ?? "");

  const [memberships, companies, branches] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: user.id },
      select: { companyId: true, branchId: true, role: { select: { permissions: true } } },
    }),
    prisma.company.findMany({ select: { id: true, active: true } }),
    prisma.branch.findMany({ select: { id: true, companyId: true, active: true } }),
  ]);
  const access = accessibleBranches({
    isSuperadmin: user.isSuperadmin,
    memberships: memberships.map((m) => ({ companyId: m.companyId, branchId: m.branchId, permissions: m.role.permissions })),
    companies,
    branches,
  });
  if (!access.has(branchId)) redirect("/seleccionar");

  (await cookies()).set(SCOPE_COOKIE, branchId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}
