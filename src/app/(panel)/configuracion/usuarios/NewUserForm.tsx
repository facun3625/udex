"use client";

import { useActionState } from "react";
import { createUserAction, type UserFormState } from "@/app/actions/users";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GeneratedPassword } from "@/components/panel/GeneratedPassword";

export function NewUserForm({ roles, branches, allowBranchChoice }: { roles: { id: string; name: string }[]; branches: { id: string; name: string }[]; allowBranchChoice: boolean }) {
  const [state, action, pending] = useActionState<UserFormState, FormData>(createUserAction, {});

  if (state.saved && state.generatedPassword) {
    return (
      <Card className="flex max-w-2xl flex-col gap-4 p-5">
        <p className="font-medium">Usuario creado.</p>
        <GeneratedPassword password={state.generatedPassword} label="Contraseña temporal" />
        <Button variant="secondary" onClick={() => location.reload()}>Crear otro usuario</Button>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl p-5">
      <h2 className="mb-4 font-medium">Nuevo usuario</h2>
      <form action={action} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required>{(p) => <Input {...p} name="name" required />}</Field>
          <Field label="Email" required>{(p) => <Input {...p} name="email" type="email" required />}</Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rol" required>
            {(p) => (
              <Select {...p} name="roleId" required defaultValue="">
                <option value="" disabled>Elegí un rol</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            )}
          </Field>
          {allowBranchChoice && (
            <Field label="Acceso" hint="Vacío = todas las sucursales">
              {(p) => (
                <Select {...p} name="branchId" defaultValue="">
                  <option value="">Todas las sucursales</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>Solo {b.name}</option>)}
                </Select>
              )}
            </Field>
          )}
        </div>
        {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
        <Button type="submit" loading={pending} className="self-start">Crear usuario</Button>
      </form>
    </Card>
  );
}
