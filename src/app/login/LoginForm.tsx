"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/session";

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
      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
