"use client";

import { useActionState } from "react";
import { saveLicenseAction, type LicenseFormState } from "./actions";

type Props = {
  modules: { key: string; label: string; enabled: boolean }[];
  values: {
    clientName: string;
    plan: string;
    maxCompanies: number | null;
    maxBranches: number | null;
    maxUsers: number | null;
    expiresAt: string; // yyyy-mm-dd o ""
  };
};

export function LicenseForm({ modules, values }: Props) {
  const [state, action, pending] = useActionState<LicenseFormState, FormData>(saveLicenseAction, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Cliente
          <input name="clientName" defaultValue={values.clientName} required className="input" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Plan
          <input name="plan" defaultValue={values.plan} required className="input" />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Módulos habilitados</legend>
        {modules.map((m) => (
          <label key={m.key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="modules" value={m.key} defaultChecked={m.enabled} className="size-4" />
            {m.label}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        {(["maxCompanies", "maxBranches", "maxUsers"] as const).map((k) => (
          <label key={k} className="flex flex-col gap-1 text-sm font-medium">
            {{ maxCompanies: "Máx. empresas", maxBranches: "Máx. sucursales", maxUsers: "Máx. usuarios" }[k]}
            <input name={k} type="number" min={1} defaultValue={values[k] ?? ""} placeholder="Sin límite" className="input" />
          </label>
        ))}
      </div>

      <label className="flex max-w-xs flex-col gap-1 text-sm font-medium">
        Vence
        <input name="expiresAt" type="date" defaultValue={values.expiresAt} className="input" />
        <span className="text-xs font-normal text-neutral-500">Vacío = no vence. Vencida, el sistema queda en solo lectura.</span>
      </label>

      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.saved && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">Licencia guardada.</p>}
      <button type="submit" disabled={pending} className="btn-primary self-start">
        {pending ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
