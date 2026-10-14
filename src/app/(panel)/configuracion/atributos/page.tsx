import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { Card, PageHeader } from "@/components/ui/Card";
import { AttributeCard } from "./AttributeCard";
import { NewAttributeForm } from "./NewAttributeForm";

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
        {attributes.map((a) => <AttributeCard key={a.id} attribute={a} />)}
        {attributes.length === 0 && <p className="text-sm text-muted">Todavía no hay atributos.</p>}
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-medium">Nuevo atributo</h2>
        <NewAttributeForm />
      </Card>
    </div>
  );
}
