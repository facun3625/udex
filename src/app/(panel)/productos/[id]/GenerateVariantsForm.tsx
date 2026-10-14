"use client";

import { useActionState } from "react";
import { generateVariantsAction, type GenerateVariantsState } from "@/app/actions/products";
import { Button } from "@/components/ui/Button";

type AxisInput = { attributeId: string; name: string; options: { id: string; value: string; colorHex: string | null; used: boolean }[] };

export function GenerateVariantsForm({ productId, axes }: { productId: string; axes: AxisInput[] }) {
  const [state, action, pending] = useActionState<GenerateVariantsState, FormData>(generateVariantsAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="productId" value={productId} />
      {axes.map((axis) => (
        <fieldset key={axis.attributeId}>
          <legend className="mb-1.5 text-sm font-medium">{axis.name}</legend>
          <div className="flex flex-wrap gap-2">
            {axis.options.map((o) => (
              <label key={o.id} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="checkbox" name={`opt_${axis.attributeId}`} value={o.id} defaultChecked={o.used} className="size-4 accent-accent" />
                {o.colorHex && <span className="size-3 rounded-full border border-line" style={{ background: o.colorHex }} />}
                {o.value}
              </label>
            ))}
            {axis.options.length === 0 && <p className="text-sm text-muted">Sin opciones cargadas.</p>}
          </div>
        </fieldset>
      ))}
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.created !== undefined && (
        <p role="status" className="text-sm text-ok">
          {state.created > 0 ? `Se crearon ${state.created} variante${state.created === 1 ? "" : "s"}.` : "No había variantes nuevas para crear."}
          {state.skipped! > 0 && ` (${state.skipped} ya existían.)`}
        </p>
      )}
      <Button type="submit" loading={pending} className="self-start">Generar variantes</Button>
    </form>
  );
}
