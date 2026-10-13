"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { ScanInput } from "@/components/scan/ScanInput";
import { useToast } from "@/components/ui/Feedback";
import { cx } from "@/components/ui/cx";
import { scanIntoAdjustmentAction } from "@/app/actions/stockAdjustments";

export function AdjustmentScanner({ adjustmentId }: { adjustmentId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [direction, setDirection] = useState<1 | -1>(1);

  async function handleScan(code: string, multiplier: number) {
    const result = await scanIntoAdjustmentAction(adjustmentId, code, multiplier, direction);
    if (!result.ok) {
      toast.error(`Código "${result.code}" no está en el catálogo`);
      throw new Error("unknown-code");
    }
    toast.ok(`${result.productName} (${result.sku}) · ${direction === 1 ? "+" : "−"}${multiplier} · total ${result.delta}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Al escanear:</span>
        <div className="inline-flex rounded-lg border border-line p-0.5">
          <button
            type="button"
            onClick={() => setDirection(1)}
            className={cx("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", direction === 1 ? "bg-ok-soft text-ok" : "text-muted")}
          >
            <Plus className="size-4" /> Suma
          </button>
          <button
            type="button"
            onClick={() => setDirection(-1)}
            className={cx("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", direction === -1 ? "bg-danger-soft text-danger" : "text-muted")}
          >
            <Minus className="size-4" /> Resta
          </button>
        </div>
      </div>
      <ScanInput onScan={handleScan} placeholder={direction === 1 ? "Escaneá lo que hay que sumar" : "Escaneá lo que hay que restar"} />
    </div>
  );
}
