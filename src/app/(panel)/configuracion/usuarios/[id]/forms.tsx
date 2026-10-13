"use client";

import { useActionState } from "react";
import { addAccessAction, resetPasswordAction, type UserFormState } from "@/app/actions/users";
import { Field, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { GeneratedPassword } from "@/components/panel/GeneratedPassword";

export function AddAccessForm({ userId, roles, branches }: { userId: string; roles: { id: string; name: string }[]; branches: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<UserFormState, FormData>(addAccessAction, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="userId" value={userId} />
      <Field label="Rol" className="min-w-40">
        {(p) => (
          <Select {...p} name="roleId" required defaultValue="">
            <option value="" disabled>Elegí un rol</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label="Sucursal" className="min-w-40">
        {(p) => (
          <Select {...p} name="branchId" defaultValue="">
            <option value="">Todas las sucursales</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        )}
      </Field>
      <Button type="submit" loading={pending} variant="secondary">Agregar acceso</Button>
      {state.error && <p role="alert" className="w-full text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<UserFormState, FormData>(resetPasswordAction, {});
  if (state.generatedPassword) return <GeneratedPassword password={state.generatedPassword} label="Nueva contraseña temporal" />;
  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="secondary" loading={pending}>Restablecer contraseña</Button>
      {state.error && <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p>}
    </form>
  );
}
