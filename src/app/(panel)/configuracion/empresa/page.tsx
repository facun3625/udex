import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { branchLimit } from "@/modules/core/rules";
import { formatCuit } from "@/modules/core/cuit";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { NewBranchForm, NewWarehouseForm } from "./forms";

export const metadata = { title: "Empresa y sucursales · Udex" };

const IVA_LABEL: Record<string, string> = { responsable_inscripto: "Responsable Inscripto", monotributo: "Monotributo", exento: "Exento" };

export default async function CompanyPage() {
  const ctx = await requireContext();
  requirePermission(ctx, "settings.manage");

  const [company, branches] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: ctx.companyId } }),
    prisma.branch.findMany({ where: { companyId: ctx.companyId }, orderBy: { name: "asc" }, include: { warehouses: { orderBy: { name: "asc" } } } }),
  ]);
  const limit = branchLimit(ctx.license);
  const canAddBranch = limit === null || branches.length < limit;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Empresa y sucursales" />

      <Card className="p-5">
        <h2 className="mb-3 font-medium">Datos fiscales</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Razón social</dt><dd>{company.legalName}</dd></div>
          <div><dt className="text-muted">Nombre de fantasía</dt><dd>{company.tradeName ?? "—"}</dd></div>
          <div><dt className="text-muted">CUIT</dt><dd className="tabular">{formatCuit(company.cuit)}</dd></div>
          <div><dt className="text-muted">Condición IVA</dt><dd>{IVA_LABEL[company.ivaCondition]}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">La edición de estos datos y los de facturación (Ingresos Brutos, domicilio) se completa en F4 junto con ARCA.</p>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Sucursales y depósitos</h2>
          {limit !== null && <Badge tone={canAddBranch ? "neutral" : "warn"}>{branches.length} / {limit}</Badge>}
        </div>
        <div className="flex flex-col divide-y divide-line">
          {branches.map((b) => (
            <div key={b.id} className="py-3">
              <p className="font-medium">{b.name}</p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {b.warehouses.map((w) => (
                  <li key={w.id}><Badge tone={w.kind === "logical" ? "neutral" : "accent"}>{w.name}</Badge></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4">
          {canAddBranch ? (
            <NewBranchForm />
          ) : (
            <p className="text-sm text-muted">
              Tu plan permite hasta {limit} sucursal{limit === 1 ? "" : "es"}.{" "}
              {limit === 1 && "Hablá con soporte para habilitar varias sucursales."}
            </p>
          )}
          <NewWarehouseForm branches={branches.map((b) => ({ id: b.id, name: b.name }))} />
        </div>
      </Card>
    </div>
  );
}
