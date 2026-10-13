import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { removeAccessAction, toggleUserActiveAction } from "@/app/actions/users";
import { AddAccessForm, ResetPasswordButton } from "./forms";

export const metadata = { title: "Usuario · Udex" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext();
  requirePermission(ctx, "users.manage");
  const { id } = await params;

  const [user, memberships, roles, branches] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.membership.findMany({ where: { userId: id, companyId: ctx.companyId }, include: { role: true, branch: true }, orderBy: { createdAt: "asc" } }),
    prisma.role.findMany({ orderBy: [{ isSystem: "desc" }, { name: "asc" }] }),
    prisma.branch.findMany({ where: { companyId: ctx.companyId }, orderBy: { name: "asc" } }),
  ]);
  if (!user || user.isSuperadmin) notFound();
  const isSelf = user.id === ctx.user.id;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/configuracion/usuarios" className="text-sm underline">← Usuarios</Link>
        <PageHeader
          title={user.name}
          description={user.email}
          actions={
            <>
              <Badge tone={user.active ? "ok" : "neutral"}>{user.active ? "Activo" : "Desactivado"}</Badge>
              {!isSelf && (
                <form action={toggleUserActiveAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <button type="submit" className="text-sm underline">{user.active ? "Desactivar" : "Reactivar"}</button>
                </form>
              )}
            </>
          }
        />
      </div>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="font-medium">Accesos en esta empresa</h2>
        <ul className="flex flex-col divide-y divide-line">
          {memberships.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2 text-sm">
              <span>{m.role.name} · {m.branch?.name ?? "Todas las sucursales"}</span>
              <form action={removeAccessAction}>
                <input type="hidden" name="membershipId" value={m.id} />
                <button type="submit" className="text-muted underline hover:text-danger">Quitar</button>
              </form>
            </li>
          ))}
          {memberships.length === 0 && <li className="py-2 text-sm text-muted">Sin accesos en esta empresa.</li>}
        </ul>
        <AddAccessForm userId={user.id} roles={roles.map((r) => ({ id: r.id, name: r.name }))} branches={branches} />
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-medium">Contraseña</h2>
        <ResetPasswordButton userId={user.id} />
      </Card>
    </div>
  );
}
