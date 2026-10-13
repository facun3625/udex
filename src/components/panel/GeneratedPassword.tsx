"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Muestra una contraseña generada una sola vez (no se vuelve a mostrar): el usuario la copia o la anota
// antes de cerrar. Se usa al crear un usuario y al restablecer su contraseña.
export function GeneratedPassword({ password, label }: { password: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-ok/30 bg-ok-soft p-4 text-sm">
      <p className="font-medium text-ok">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md bg-surface px-3 py-2 font-mono text-base tracking-wide text-text select-all">{password}</code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface hover:bg-surface-2"
          aria-label="Copiar contraseña"
        >
          {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
        </button>
      </div>
      <p className="text-ok/80">Guardala o pasásela a la persona ahora: no se vuelve a mostrar.</p>
    </div>
  );
}
