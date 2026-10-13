"use client";

import { useActionState } from "react";
import { X } from "lucide-react";
import { addBarcodeAction, removeBarcodeAction, type ProductFormState } from "@/app/actions/products";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";

type BarcodeRow = { id: string; code: string; isPrimary: boolean };

export function BarcodesPanel({ variantId, barcodes }: { variantId: string; barcodes: BarcodeRow[] }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(addBarcodeAction, {});
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {barcodes.map((b) => (
          <span key={b.id} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 py-1 pr-1 pl-2.5 text-sm">
            <code className="tabular">{b.code}</code>
            {b.isPrimary && <Badge tone="accent">principal</Badge>}
            <form action={removeBarcodeAction}>
              <input type="hidden" name="barcodeId" value={b.id} />
              <button type="submit" aria-label={`Quitar ${b.code}`} className="flex size-5 items-center justify-center rounded text-muted hover:bg-danger-soft hover:text-danger">
                <X className="size-3.5" />
              </button>
            </form>
          </span>
        ))}
        {barcodes.length === 0 && <p className="text-sm text-muted">Sin códigos de barras todavía.</p>}
      </div>
      <form action={action} className="flex items-end gap-2">
        <input type="hidden" name="variantId" value={variantId} />
        <Field label="Agregar código" className="max-w-56">
          {(p) => <Input {...p} name="code" placeholder="Escaneá o escribí" />}
        </Field>
        <Button type="submit" size="sm" variant="secondary" loading={pending}>Agregar</Button>
      </form>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </div>
  );
}
