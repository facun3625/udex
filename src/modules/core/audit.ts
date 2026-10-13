import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma, type Tx } from "@/lib/prisma";

export type AuditEntry = {
  action: string; // "user.create", "stock.adjust"...
  targetType?: string;
  targetId?: string;
  summary?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
};

type Actor = { companyId?: string | null; user: { id: string; email: string } };

// Pasar `tx` cuando la acción auditada es parte de una transacción: si la transacción se revierte, el
// registro de auditoría también (no queda auditado algo que no pasó).
export async function audit(actor: Actor, entry: AuditEntry, tx: Tx | typeof prisma = prisma) {
  await tx.auditLog.create({
    data: {
      companyId: actor.companyId ?? null,
      userId: actor.user.id,
      userEmail: actor.user.email,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      summary: entry.summary,
      before: entry.before,
      after: entry.after,
    },
  });
}
