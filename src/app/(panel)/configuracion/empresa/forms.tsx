"use client";

import { useActionState } from "react";
import { createBranchAction, createWarehouseAction, type BranchFormState } from "@/app/actions/branches";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function NewBranchForm() {
  const [state, action, pending] = useActionState<BranchFormState, FormData>(createBranchAction, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Field label="Nueva sucursal" className="min-w-48 flex-1">
        {(p) => <Input {...p} name="name" required placeholder="Ej: Sucursal Sur" />}
      </Field>
      <Button type="submit" loading={pending} variant="secondary">Agregar</Button>
      {state.error && <p role="alert" className="w-full text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function NewWarehouseForm({ branches }: { branches: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<BranchFormState, FormData>(createWarehouseAction, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Field label="Sucursal" className="min-w-40">
        {(p) => (
          <Select {...p} name="branchId" required defaultValue="">
            <option value="" disabled>Elegí una</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label="Nuevo depósito" className="min-w-48 flex-1">
        {(p) => <Input {...p} name="name" required placeholder="Ej: Depósito fallados" />}
      </Field>
      <Field label="Tipo" className="min-w-36">
        {(p) => (
          <Select {...p} name="kind" defaultValue="physical">
            <option value="physical">Físico</option>
            <option value="logical">Lógico (tránsito, fallados...)</option>
          </Select>
        )}
      </Field>
      <Button type="submit" loading={pending} variant="secondary">Agregar</Button>
      {state.error && <p role="alert" className="w-full text-sm text-danger">{state.error}</p>}
    </form>
  );
}
