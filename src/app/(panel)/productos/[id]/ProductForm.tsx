"use client";

import { useActionState, useState } from "react";
import { updateProductAction, type ProductFormState } from "@/app/actions/products";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { CategoryOption } from "@/modules/catalog/categories";
import { NewCategoryDialog } from "./NewCategoryDialog";

const NEW_CATEGORY = "__nueva__";

export function ProductForm({
  productId,
  categories,
  defaults,
}: {
  productId: string;
  categories: CategoryOption[];
  defaults: { name: string; description: string; categoryId: string | null; ivaRate: string; status: string };
}) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(updateProductAction, {});
  const [creatingCategory, setCreatingCategory] = useState(false);

  return (
    <>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="productId" value={productId} />
        <Field label="Nombre" required>{(p) => <Input {...p} name="name" required defaultValue={defaults.name} />}</Field>
        <Field label="Descripción">{(p) => <Textarea {...p} name="description" defaultValue={defaults.description} />}</Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Categoría" hint="Opcional" className="sm:col-span-2">
            {(p) => (
              <Select
                {...p}
                name="categoryId"
                defaultValue={defaults.categoryId ?? ""}
                onChange={(e) => {
                  if (e.target.value === NEW_CATEGORY) {
                    e.target.value = defaults.categoryId ?? ""; // no se queda seleccionado el "crear nueva"
                    setCreatingCategory(true);
                  }
                }}
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                <option value={NEW_CATEGORY}>+ Crear categoría nueva...</option>
              </Select>
            )}
          </Field>
          <Field label="IVA %" required>{(p) => <Input {...p} name="ivaRate" required defaultValue={defaults.ivaRate} />}</Field>
        </div>
        <Field label="Estado" required>
          {(p) => (
            <Select {...p} name="status" required defaultValue={defaults.status}>
              <option value="draft">Borrador (no se vende)</option>
              <option value="active">Activo</option>
              <option value="archived">Archivado</option>
            </Select>
          )}
        </Field>
        {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
        {state.saved && <p role="status" className="text-sm text-ok">Guardado.</p>}
        <Button type="submit" loading={pending} className="self-start">Guardar</Button>
      </form>
      {creatingCategory && <NewCategoryDialog productId={productId} onClose={() => setCreatingCategory(false)} />}
    </>
  );
}
