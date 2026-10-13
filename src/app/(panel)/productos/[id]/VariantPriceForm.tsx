"use client";

import { useActionState } from "react";
import { updateVariantAction, type ProductFormState } from "@/app/actions/products";
import { Field, Input } from "@/components/ui/Field";
import { DecimalInput } from "@/components/ui/DecimalInput";
import { Button } from "@/components/ui/Button";

export function VariantPriceForm({ variantId, defaults }: { variantId: string; defaults: { sku: string; price: string; compareAtPrice: string; costPrice: string } }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(updateVariantAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="variantId" value={variantId} />
      <Field label="SKU" required hint="Código interno del producto, único en la empresa">
        {(p) => <Input {...p} name="sku" required defaultValue={defaults.sku} className="uppercase" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Precio de venta" required>
          {(p) => <DecimalInput {...p} name="price" defaultValue={defaults.price} required />}
        </Field>
        <Field label="Precio de lista" hint="Para mostrar tachado">
          {(p) => <DecimalInput {...p} name="compareAtPrice" defaultValue={defaults.compareAtPrice} />}
        </Field>
        <Field label="Costo" hint="Uso interno, no se muestra al cliente">
          {(p) => <DecimalInput {...p} name="costPrice" defaultValue={defaults.costPrice} />}
        </Field>
      </div>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.saved && <p role="status" className="text-sm text-ok">Guardado.</p>}
      <Button type="submit" loading={pending} className="self-start">Guardar</Button>
    </form>
  );
}
