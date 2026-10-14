import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { ATTRIBUTE_TYPES, hasOptions } from "@/modules/catalog/attributeTypes";
import { Badge, Card, PageHeader } from "@/components/ui/Card";
import { removeAttributeOptionAction } from "@/app/actions/attributes";
import { NewAttributeForm } from "./NewAttributeForm";
import { AddOptionForm } from "./AddOptionForm";

export const metadata = { title: "Atributos · Udex" };

export default async function AttributesPage() {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");

  const attributes = await prisma.attribute.findMany({
    where: { companyId: ctx.companyId },
    include: { options: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Atributos" description="Talles, colores y demás ejes que se usan para generar variantes de un producto." />

      <div className="flex flex-col gap-3">
        {attributes.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">{a.name}</h2>
              <Badge>{ATTRIBUTE_TYPES[a.type]}</Badge>
            </div>
            {hasOptions(a.type) && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {a.options.map((o) => (
                    <span key={o.id} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 py-1 pr-1 pl-2.5 text-sm">
                      {o.colorHex && <span className="size-3 rounded-full border border-line" style={{ background: o.colorHex }} />}
                      {o.value}
                      <form action={removeAttributeOptionAction}>
                        <input type="hidden" name="optionId" value={o.id} />
                        <button type="submit" title="Quitar (si no está en uso)" className="flex size-5 items-center justify-center rounded text-muted hover:bg-danger-soft hover:text-danger">×</button>
                      </form>
                    </span>
                  ))}
                  {a.options.length === 0 && <p className="text-sm text-muted">Sin opciones.</p>}
                </div>
                <AddOptionForm attributeId={a.id} isColor={a.type === "color"} />
              </div>
            )}
          </Card>
        ))}
        {attributes.length === 0 && <p className="text-sm text-muted">Todavía no hay atributos.</p>}
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-medium">Nuevo atributo</h2>
        <NewAttributeForm />
      </Card>
    </div>
  );
}
