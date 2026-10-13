"use client";

import { useActionState } from "react";
import { createCompanyAction, type OnboardingState } from "@/app/actions/onboarding";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { INDUSTRIES } from "@/modules/core/industries";

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createCompanyAction, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="CUIT" required hint="Se valida el dígito verificador">
        {(p) => <Input {...p} name="cuit" placeholder="30-71234567-1" required />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Razón social" required>
          {(p) => <Input {...p} name="legalName" required />}
        </Field>
        <Field label="Nombre de fantasía" hint="Opcional: como se va a mostrar en el panel">
          {(p) => <Input {...p} name="tradeName" />}
        </Field>
      </div>
      <Field label="Condición frente al IVA" required>
        {(p) => (
          <Select {...p} name="ivaCondition" required defaultValue="responsable_inscripto">
            <option value="responsable_inscripto">Responsable Inscripto</option>
            <option value="monotributo">Monotributo</option>
            <option value="exento">Exento</option>
          </Select>
        )}
      </Field>
      <Field label="Primera sucursal" required hint='Por ejemplo "Casa central". Se puede agregar más después.'>
        {(p) => <Input {...p} name="branchName" defaultValue="Casa central" required />}
      </Field>
      <Field label="Rubro" required hint="Sirve para precargar atributos y categorías típicas (más adelante)">
        {(p) => (
          <Select {...p} name="industry" required defaultValue="">
            <option value="" disabled>Elegí un rubro</option>
            {Object.entries(INDUSTRIES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </Select>
        )}
      </Field>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <Button type="submit" loading={pending} size="lg">Crear empresa</Button>
    </form>
  );
}
