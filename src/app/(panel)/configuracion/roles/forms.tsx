"use client";

import { useActionState } from "react";
import { createRoleAction, updateRoleAction, type RoleFormState } from "@/app/actions/roles";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { permissionGroups } from "@/modules/core/permissionGroups";

type Groups = ReturnType<typeof permissionGroups>;

function PermissionChecklist({ groups, defaultChecked }: { groups: Groups; defaultChecked: Set<string> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map((g) => (
        <fieldset key={g.title}>
          <legend className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{g.title}</legend>
          <div className="flex flex-col gap-1.5">
            {g.items.map((item) => (
              <label key={item.key} className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="permissions" value={item.key} defaultChecked={defaultChecked.has(item.key)} className="mt-0.5 size-4 accent-accent" />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export function NewRoleForm({ groups }: { groups: Groups }) {
  const [state, action, pending] = useActionState<RoleFormState, FormData>(createRoleAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nombre del rol" required className="max-w-sm">
        {(p) => <Input {...p} name="name" required placeholder="Ej: Encargado de depósito" />}
      </Field>
      <PermissionChecklist groups={groups} defaultChecked={new Set()} />
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.saved && <p role="status" className="text-sm text-ok">Rol creado.</p>}
      <Button type="submit" loading={pending} className="self-start">Crear rol</Button>
    </form>
  );
}

export function EditRoleForm({ roleId, name, permissions, groups }: { roleId: string; name: string; permissions: string[]; groups: Groups }) {
  const [state, action, pending] = useActionState<RoleFormState, FormData>(updateRoleAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="roleId" value={roleId} />
      <Field label="Nombre del rol" required className="max-w-sm">
        {(p) => <Input {...p} name="name" required defaultValue={name} />}
      </Field>
      <PermissionChecklist groups={groups} defaultChecked={new Set(permissions)} />
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.saved && <p role="status" className="text-sm text-ok">Guardado.</p>}
      <Button type="submit" loading={pending} variant="secondary" className="self-start">Guardar cambios</Button>
    </form>
  );
}
