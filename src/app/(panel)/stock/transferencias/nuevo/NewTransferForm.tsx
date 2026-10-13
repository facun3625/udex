"use client";

import { useActionState } from "react";
import { createTransferAction } from "@/app/actions/stockTransfers";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function NewTransferForm({ warehouses, originName }: { warehouses: { id: string; name: string }[]; originName: string }) {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(createTransferAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-muted">Sale de <span className="font-medium text-text">{originName}</span> (el depósito de la sucursal activa).</p>
      <Field label="Destino" required>
        {(p) => (
          <Select {...p} name="toWarehouseId" required defaultValue="">
            <option value="" disabled>Elegí un depósito</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label="Nota" hint="Opcional">{(p) => <Textarea {...p} name="note" />}</Field>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <Button type="submit" loading={pending} className="self-start">Empezar a escanear</Button>
    </form>
  );
}
