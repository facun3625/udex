"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/session";
import { Button } from "@/components/ui/Button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input name="email" type="email" required autoFocus autoComplete="username" className="input" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Contraseña
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </label>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <Button type="submit" size="lg" loading={pending}>
        Ingresar
      </Button>
    </form>
  );
}
