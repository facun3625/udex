"use client";

import { useRouter } from "next/navigation";
import { ScanInput } from "@/components/scan/ScanInput";
import { useToast } from "@/components/ui/Feedback";
import { scanIntoTransferAction } from "@/app/actions/stockTransfers";

export function TransferScanner({ transferId }: { transferId: string }) {
  const router = useRouter();
  const toast = useToast();

  async function handleScan(code: string, multiplier: number) {
    const result = await scanIntoTransferAction(transferId, code, multiplier);
    if (!result.ok) {
      toast.error(`Código "${result.code}" no está en el catálogo`);
      throw new Error("unknown-code");
    }
    toast.ok(`${result.productName} (${result.sku}) · total ${result.quantity}`);
    router.refresh();
  }

  return <ScanInput onScan={handleScan} placeholder="Escaneá lo que mandás" />;
}
