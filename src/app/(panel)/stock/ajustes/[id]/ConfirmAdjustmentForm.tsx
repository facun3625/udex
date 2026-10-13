"use client";

import { useActionState, useRef } from "react";
import { confirmAdjustmentAction, type ConfirmAdjustmentState } from "@/app/actions/stockAdjustments";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Feedback";

export function ConfirmAdjustmentForm({ adjustmentId, lineCount }: { adjustmentId: string; lineCount: number }) {
  const [state, action, pending] = useActionState<ConfirmAdjustmentState, FormData>(confirmAdjustmentAction, {});
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="adjustmentId" value={adjustmentId} />
      {state.error && <p role="alert" className="mb-2 text-sm text-danger">{state.error}</p>}
      <Button
        type="button"
        size="lg"
        loading={pending}
        disabled={lineCount === 0}
        onClick={async () => {
          const ok = await confirm({
            title: "¿Confirmar el ajuste?",
            message: `El stock de ${lineCount} producto${lineCount === 1 ? "" : "s"} se va a corregir ahora. Después no se puede deshacer desde acá.`,
            confirmLabel: "Confirmar",
          });
          if (ok) formRef.current?.requestSubmit();
        }}
      >
        Confirmar ajuste
      </Button>
    </form>
  );
}
