"use client";

import { useActionState } from "react";
import { receiveTransferAction, type ReceiveTransferState } from "@/app/actions/stockTransfers";
import { DecimalInput } from "@/components/ui/DecimalInput";
import { Button } from "@/components/ui/Button";

type Line = { id: string; productName: string; sku: string; quantity: string };

export function ReceiveTransferForm({ transferId, lines }: { transferId: string; lines: Line[] }) {
  const [state, action, pending] = useActionState<ReceiveTransferState, FormData>(receiveTransferAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="transferId" value={transferId} />
      <p className="text-sm text-muted">Revisá la cantidad que de verdad llegó de cada producto (por defecto, lo que se mandó) y confirmá.</p>
      <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
        {lines.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">{l.productName}</p>
              <p className="text-xs text-muted">{l.sku} · se mandaron {l.quantity}</p>
            </div>
            <DecimalInput name={`qty_${l.id}`} defaultValue={l.quantity} className="w-28" required />
          </div>
        ))}
      </div>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <Button type="submit" loading={pending} size="lg" className="self-start">Confirmar recepción</Button>
    </form>
  );
}
