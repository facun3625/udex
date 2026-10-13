"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireSuperadmin } from "@/modules/core/context";
import { audit } from "@/modules/core/audit";
import { isValidCuit, normalizeCuit } from "@/modules/core/cuit";
import { isIndustry } from "@/modules/core/industries";

export type OnboardingState = { error?: string };

const schema = z.object({
  cuit: z.string().refine(isValidCuit, "El CUIT no es válido (revisá los 11 dígitos)"),
  legalName: z.string().trim().min(1, "Falta la razón social"),
  tradeName: z.string().trim().optional(),
  ivaCondition: z.enum(["responsable_inscripto", "monotributo", "exento"]),
  branchName: z.string().trim().min(1, "Falta el nombre de la sucursal"),
  industry: z.string().refine(isIndustry, "Elegí un rubro"),
});

// Primera empresa de la instalación: la crea el superadmin (al instalar, o cuando un cliente nuevo
// arranca). Deja una sucursal y su depósito por defecto listos para trabajar.
export async function createCompanyAction(_prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  requireSuperadmin({ user });

  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const { cuit, legalName, tradeName, ivaCondition, branchName, industry } = parsed.data;
  const cuitNorm = normalizeCuit(cuit);

  if (await prisma.company.findUnique({ where: { cuit: cuitNorm } })) {
    return { error: "Ya hay una empresa cargada con ese CUIT" };
  }

  const company = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { cuit: cuitNorm, legalName, tradeName: tradeName || null, ivaCondition },
    });
    const branch = await tx.branch.create({ data: { companyId: company.id, name: branchName } });
    await tx.warehouse.create({
      data: { companyId: company.id, branchId: branch.id, name: `Depósito ${branchName}`, isBranchDefault: true },
    });
    await tx.setting.create({ data: { scope: company.id, key: "industry", value: { key: industry } } });
    await audit(
      { companyId: company.id, user },
      { action: "company.create", targetType: "company", targetId: company.id, summary: `Empresa creada: ${legalName}` },
      tx,
    );
    return company;
  });

  redirect(`/seleccionar?welcome=${company.id}`);
}
