"use client";

import { useActionState } from "react";
import { createAdjustmentAction } from "@/app/actions/stockAdjustments";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ADJUSTMENT_REASONS } from "@/modules/inventory/adjustmentReasons";

export function NewAdjustmentForm() {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(createAdjustmentAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Motivo" required>
        {(p) => (
          <Select {...p} name="reason" required defaultValue="">
            <option value="" disabled>Elegí un motivo</option>
            {Object.entries(ADJUSTMENT_REASONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </Select>
        )}
      </Field>
      <Field label="Nota" hint="Opcional">{(p) => <Textarea {...p} name="note" />}</Field>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <Button type="submit" loading={pending} className="self-start">Empezar a escanear</Button>
    </form>
  );
}
