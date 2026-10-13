"use client";

import { useRouter } from "next/navigation";
import { ScanInput } from "@/components/scan/ScanInput";
import { useToast } from "@/components/ui/Feedback";
import { scanIntoCountAction } from "@/app/actions/stockCounts";

export function CountScanner({ countId }: { countId: string }) {
  const router = useRouter();
  const toast = useToast();

  async function handleScan(code: string, multiplier: number) {
    const result = await scanIntoCountAction(countId, code, multiplier);
    if (!result.ok) {
      toast.error(`Código "${result.code}" no está en el catálogo`);
      throw new Error("unknown-code");
    }
    toast.ok(`${result.productName} (${result.sku}) · contado: ${result.countedQty}`);
    router.refresh();
  }

  return <ScanInput onScan={handleScan} placeholder="Escaneá lo que hay en el depósito" />;
}
