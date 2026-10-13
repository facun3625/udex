"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PackageSearch, X } from "lucide-react";
import { ScanInput } from "@/components/scan/ScanInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Feedback";
import { quickCreateProductAction, scanIntoReceiptAction } from "@/app/actions/stockReceipts";

// Un código no se reconoce hasta que se resuelve (crear el producto) o se descarta: queda guardado acá
// para no perder el multiplicador que ya se había tipeado.
type Unknown = { code: string; multiplier: number };

export function ReceiptScanner({ receiptId }: { receiptId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [unknown, setUnknown] = useState<Unknown | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  async function handleScan(code: string, multiplier: number) {
    const result = await scanIntoReceiptAction(receiptId, code, multiplier);
    if (!result.ok) {
      setUnknown({ code, multiplier });
      setName("");
      setTimeout(() => nameRef.current?.focus(), 50);
      throw new Error("unknown-code"); // ScanInput lo toma como error: bip + borde rojo
    }
    setUnknown(null);
    toast.ok(`${result.productName} (${result.sku}) +${result.quantity}`);
    router.refresh();
  }

  async function createAndAdd() {
    if (!unknown || !name.trim()) return;
    setCreating(true);
    try {
      const result = await quickCreateProductAction(receiptId, unknown.code, name.trim(), unknown.multiplier);
      if (result.ok) {
        toast.ok(`Creado: ${result.productName} (${result.sku}) +${result.quantity}`);
        setUnknown(null);
        router.refresh();
      } else {
        toast.error("No se pudo crear el producto");
      }
    } catch {
      toast.error("No se pudo crear el producto");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ScanInput onScan={handleScan} placeholder="Escaneá el producto que está entrando" />

      {unknown && (
        <div className="flex flex-col gap-3 rounded-lg border border-warn/40 bg-warn-soft p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <PackageSearch className="size-4 shrink-0" />
              <span>
                Código <code className="rounded bg-surface px-1.5 py-0.5">{unknown.code}</code> no está en el catálogo
                {unknown.multiplier !== 1 && <> · ×{unknown.multiplier}</>}
              </span>
            </div>
            <button type="button" onClick={() => setUnknown(null)} aria-label="Descartar" className="shrink-0 text-muted hover:text-text">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), createAndAdd())}
              placeholder="Nombre del producto"
              className="min-w-48 flex-1"
            />
            <Button type="button" onClick={createAndAdd} loading={creating} disabled={!name.trim()}>
              Crear y sumar
            </Button>
          </div>
          <p className="text-xs text-muted">Queda guardado el código para la próxima vez. El resto (precio, categoría) se completa después en Productos.</p>
        </div>
      )}
    </div>
  );
}
