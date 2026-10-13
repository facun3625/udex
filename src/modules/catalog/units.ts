// Unidad por defecto de cada empresa ("un", sin decimales). Todo producto nuevo la usa salvo que se
// elija otra (F2 trae el resto de las unidades y sus conversiones).
import "server-only";
import type { Tx } from "@/lib/prisma";

export async function ensureDefaultUnit(tx: Tx, companyId: string) {
  return tx.unit.upsert({
    where: { companyId_code: { companyId, code: "un" } },
    create: { companyId, code: "un", name: "Unidad", decimals: 0 },
    update: {},
  });
}
