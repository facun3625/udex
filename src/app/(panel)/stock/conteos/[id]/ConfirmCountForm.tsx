"use client";

import { useActionState, useRef } from "react";
import { confirmCountAction, type ConfirmCountState } from "@/app/actions/stockCounts";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Feedback";

export function ConfirmCountForm({ countId, diffCount }: { countId: string; diffCount: number }) {
  const [state, action, pending] = useActionState<ConfirmCountState, FormData>(confirmCountAction, {});
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="countId" value={countId} />
      {state.error && <p role="alert" className="mb-2 text-sm text-danger">{state.error}</p>}
      <Button
        type="button"
        size="lg"
        loading={pending}
        onClick={async () => {
          const ok = await confirm({
            title: "¿Cerrar el conteo?",
            message:
              diffCount > 0
                ? `El stock de ${diffCount} producto${diffCount === 1 ? "" : "s"} con diferencia se corrige al número contado. Lo que no escaneaste no se toca.`
                : "No hay diferencias contra lo que ya figura en el sistema. El conteo se cierra igual, sin generar movimientos.",
            confirmLabel: "Cerrar conteo",
          });
          if (ok) formRef.current?.requestSubmit();
        }}
      >
        Cerrar conteo
      </Button>
    </form>
  );
}
