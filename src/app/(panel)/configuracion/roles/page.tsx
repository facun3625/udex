import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { permissionGroups } from "@/modules/core/permissionGroups";
import { PERMISSIONS } from "@/modules/core/permissions";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { EditRoleForm, NewRoleForm } from "./forms";

export const metadata = { title: "Roles y permisos · Udex" };

export default async function RolesPage() {
  const ctx = await requireContext();
  requirePermission(ctx, "users.manage");

  const roles = await prisma.role.findMany({ orderBy: [{ isSystem: "desc" }, { name: "asc" }] });
  const groups = permissionGroups();
  const allPermissionLabels = PERMISSIONS;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Roles y permisos" description="Los roles del sistema no se pueden editar. Podés crear roles propios." />

      <div className="flex flex-col gap-3">
        {roles.map((r) => (
          <Card key={r.id} className="p-5">
            <details open={!r.isSystem}>
              <summary className="flex cursor-pointer items-center justify-between gap-3">
                <span className="font-medium">{r.name}</span>
                <Badge tone={r.isSystem ? "neutral" : "accent"}>{r.isSystem ? "Del sistema" : "Propio"}</Badge>
              </summary>
              <div className="mt-4">
                {r.isSystem ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {r.permissions.map((p) => (
                      <li key={p}><Badge>{allPermissionLabels[p as keyof typeof allPermissionLabels] ?? p}</Badge></li>
                    ))}
                  </ul>
                ) : (
                  <EditRoleForm roleId={r.id} name={r.name} permissions={r.permissions} groups={groups} />
                )}
              </div>
            </details>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-medium">Nuevo rol</h2>
        <NewRoleForm groups={groups} />
      </Card>
    </div>
  );
}
