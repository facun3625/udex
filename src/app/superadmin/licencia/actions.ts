"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireSuperadmin } from "@/modules/core/context";
import { isModuleKey } from "@/modules/core/modules";
import { audit } from "@/modules/core/audit";

export type LicenseFormState = { error?: string; saved?: boolean };

const optionalInt = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().nullable());

const schema = z.object({
  clientName: z.string().trim().min(1, "Falta el nombre del cliente"),
  plan: z.string().trim().min(1, "Falta el plan"),
  maxCompanies: optionalInt,
  maxBranches: optionalInt,
  maxUsers: optionalInt,
  // Fecha del input type="date": vence al terminar ese día, hora de Argentina.
  expiresAt: z.preprocess((v) => (v ? new Date(`${v}T23:59:59-03:00`) : null), z.date().nullable()),
});

export async function saveLicenseAction(_prev: LicenseFormState, form: FormData): Promise<LicenseFormState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  requireSuperadmin({ user });

  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const modules = form.getAll("modules").map(String).filter(isModuleKey);

  const before = await prisma.installationLicense.findUnique({ where: { id: "installation" } });
  const data = { ...parsed.data, modules };
  const after = await prisma.installationLicense.upsert({
    where: { id: "installation" },
    create: { id: "installation", ...data },
    update: data,
  });
  await audit(
    { user },
    {
      action: "license.update",
      targetType: "license",
      targetId: "installation",
      summary: `Licencia: ${after.plan} · ${modules.length} módulos`,
      before: before ? JSON.parse(JSON.stringify(before)) : undefined,
      after: JSON.parse(JSON.stringify(after)),
    },
  );
  revalidatePath("/", "layout");
  return { saved: true };
}
