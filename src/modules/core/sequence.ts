import "server-only";
import type { Tx } from "@/lib/prisma";

// Próximo número de un numerador interno (remitos, presupuestos, ingresos...). Tiene que llamarse dentro
// de la transacción que crea el documento: el UPDATE bloquea la fila hasta el commit, así que dos
// documentos simultáneos nunca reciben el mismo número, y si la transacción falla el número no se gasta.
export async function nextSequence(tx: Tx, companyId: string, key: string): Promise<number> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "Sequence" ("companyId", "key", "value") VALUES (${companyId}, ${key}, 1)
    ON CONFLICT ("companyId", "key") DO UPDATE SET "value" = "Sequence"."value" + 1
    RETURNING "value"`;
  return rows[0].value;
}
