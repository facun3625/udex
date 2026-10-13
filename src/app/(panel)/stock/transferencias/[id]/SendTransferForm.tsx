"use client";

import { useActionState, useRef } from "react";
import { sendTransferAction, type SendTransferState } from "@/app/actions/stockTransfers";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Feedback";

export function SendTransferForm({ transferId, lineCount }: { transferId: string; lineCount: number }) {
  const [state, action, pending] = useActionState<SendTransferState, FormData>(sendTransferAction, {});
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="transferId" value={transferId} />
      {state.error && <p role="alert" className="mb-2 text-sm text-danger">{state.error}</p>}
      <Button
        type="button"
        size="lg"
        loading={pending}
        disabled={lineCount === 0}
        onClick={async () => {
          const ok = await confirm({
            title: "¿Enviar la transferencia?",
            message: `El stock de ${lineCount} producto${lineCount === 1 ? "" : "s"} se descuenta del origen ahora. El destino lo suma recién cuando alguien confirme la recepción.`,
            confirmLabel: "Enviar",
          });
          if (ok) formRef.current?.requestSubmit();
        }}
      >
        Enviar transferencia
      </Button>
    </form>
  );
}
