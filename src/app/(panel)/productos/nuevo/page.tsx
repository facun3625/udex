import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireContext, requirePermission } from "@/modules/core/context";
import { categoryOptions } from "@/modules/catalog/categories";
import { Card, PageHeader } from "@/components/ui/Card";
import { NewProductForm } from "./NewProductForm";

export const metadata = { title: "Nuevo producto · Udex" };

export default async function NewProductPage() {
  const ctx = await requireContext();
  requirePermission(ctx, "catalog.edit");
  const categories = await prisma.category.findMany({ where: { companyId: ctx.companyId }, select: { id: true, name: true, parentId: true } });

  return (
    <div className="max-w-xl">
      <Link href="/productos" className="text-sm underline">← Productos</Link>
      <PageHeader title="Nuevo producto" />
      <Card className="p-5">
        <NewProductForm categories={categoryOptions(categories)} />
      </Card>
    </div>
  );
}
