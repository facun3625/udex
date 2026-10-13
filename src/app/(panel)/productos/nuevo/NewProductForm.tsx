"use client";

import { useActionState } from "react";
import { createProductAction, type ProductFormState } from "@/app/actions/products";
import { Field, Input, Select } from "@/components/ui/Field";
import { DecimalInput } from "@/components/ui/DecimalInput";
import { Button } from "@/components/ui/Button";
import type { CategoryOption } from "@/modules/catalog/categories";

export function NewProductForm({ categories }: { categories: CategoryOption[] }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(createProductAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nombre" required>{(p) => <Input {...p} name="name" required autoFocus />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoría" hint="Opcional, se puede asignar después">
          {(p) => (
            <Select {...p} name="categoryId" defaultValue="">
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          )}
        </Field>
        <Field label="IVA %" required>{(p) => <Input {...p} name="ivaRate" defaultValue="21" required />}</Field>
      </div>
      <Field label="Precio de venta" hint="Se puede dejar en 0 y completarlo después">
        {(p) => <DecimalInput {...p} name="price" defaultValue="" placeholder="0,00" />}
      </Field>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <Button type="submit" loading={pending} className="self-start">Crear producto</Button>
    </form>
  );
}
