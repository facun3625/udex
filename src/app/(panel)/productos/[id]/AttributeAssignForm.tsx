"use client";

import { useActionState } from "react";
import { setProductAttributesAction, type ProductFormState } from "@/app/actions/products";
import { Button } from "@/components/ui/Button";

type AttrOption = { id: string; name: string };

export function AttributeAssignForm({ productId, allAttributes, selectedIds }: { productId: string; allAttributes: AttrOption[]; selectedIds: string[] }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(setProductAttributesAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="productId" value={productId} />
      <p className="text-sm text-muted">Elegí qué atributos usa este producto para generar variantes (ej. Talle y Color).</p>
      <div className="flex flex-wrap gap-3">
        {allAttributes.map((a) => (
          <label key={a.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
            <input type="checkbox" name="attributeId" value={a.id} defaultChecked={selectedIds.includes(a.id)} className="size-4 accent-accent" />
            {a.name}
          </label>
        ))}
        {allAttributes.length === 0 && <p className="text-sm text-muted">Todavía no hay atributos. Creá uno en Configuración → Atributos.</p>}
      </div>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" loading={pending} variant="secondary" className="self-start">Guardar atributos</Button>
    </form>
  );
}
