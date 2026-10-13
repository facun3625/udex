"use server";

import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { getAccess, getSessionUser, SCOPE_COOKIE } from "@/modules/core/context";

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

  if (!(await getAccess(user)).has(branchId)) redirect("/seleccionar");

  (await cookies()).set(SCOPE_COOKIE, branchId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}
