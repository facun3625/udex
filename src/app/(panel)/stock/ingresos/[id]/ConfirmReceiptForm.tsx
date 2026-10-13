"use client";

import { useActionState, useRef } from "react";
import { confirmReceiptAction, type ConfirmReceiptState } from "@/app/actions/stockReceipts";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Feedback";

export function ConfirmReceiptForm({ receiptId, lineCount }: { receiptId: string; lineCount: number }) {
  const [state, action, pending] = useActionState<ConfirmReceiptState, FormData>(confirmReceiptAction, {});
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="receiptId" value={receiptId} />
      {state.error && <p role="alert" className="mb-2 text-sm text-danger">{state.error}</p>}
      <Button
        type="button" // no dispara el submit nativo: si fuera "submit", requestSubmit() volvería a
        // entrar acá mismo (no hay onSubmit que interceptar, así que se evita el loop directamente).
        size="lg"
        loading={pending}
        disabled={lineCount === 0}
        onClick={async () => {
          const ok = await confirm({
            title: "¿Confirmar el ingreso?",
            message: `El stock de ${lineCount} producto${lineCount === 1 ? "" : "s"} va a sumar ahora. Después no se puede deshacer desde acá.`,
            confirmLabel: "Confirmar",
          });
          if (ok) formRef.current?.requestSubmit();
        }}
      >
        Confirmar ingreso
      </Button>
    </form>
  );
}
