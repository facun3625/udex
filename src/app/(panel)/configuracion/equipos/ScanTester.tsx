"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { ScanInput } from "@/components/scan/ScanInput";
import { diagnoseScanAction } from "./actions";

type Diagnosis = Awaited<ReturnType<typeof diagnoseScanAction>>;

export function ScanTester() {
  const [raw, setRaw] = useState<string | null>(null);
  const [diag, setDiag] = useState<Diagnosis | null>(null);

  async function onScan(code: string) {
    setRaw(code);
    const d = await diagnoseScanAction(code);
    setDiag(d);
    // El bip/borde rojo es solo para problemas DEL LECTOR (faltó el Enter, caracteres cambiados por el
    // idioma de teclado). Que no tenga formato de código de barras no es un problema: puede ser
    // perfectamente un SKU tipeado a mano para la prueba.
    if (d.hadControlChars || d.hadUnexpectedChars) throw new Error("lector-mal-configurado");
  }

  return (
    <div className="flex flex-col gap-4">
      <ScanInput onScan={onScan} placeholder="Escaneá cualquier producto para probar el lector" />
      {diag && (
        <div className="flex flex-col gap-2 rounded-lg border border-line p-4 text-sm">
          <p>
            Se recibió: <code className="rounded bg-surface-2 px-1.5 py-0.5">{raw}</code>
          </p>
          <Check ok={!diag.hadControlChars} okText="Llega con el Enter al final, como corresponde." badText='No llegó un Enter al final — en la configuración del lector (manual impreso) buscá el código "Agregar sufijo Enter" o "Carriage Return" y escaneálo.' />
          <Check ok={!diag.hadUnexpectedChars} okText="Los caracteres se leen bien." badText='Aparecen símbolos raros (por ejemplo "/" en vez de "-"): el lector tiene el idioma de teclado mal configurado. Buscá en el manual el código "Teclado US" o "Keyboard layout: US" y escaneálo.' />
          <Check ok={diag.looksLikeValidBarcode} okText="Es un código de barras válido (EAN/UPC)." badText="No tiene formato de código de barras — puede ser un código interno o un SKU tipeado a mano, no necesariamente un problema." neutral />
        </div>
      )}
    </div>
  );
}

function Check({ ok, okText, badText, neutral }: { ok: boolean; okText: string; badText: string; neutral?: boolean }) {
  if (ok) return <p className="flex items-start gap-2 text-ok"><CircleCheck className="mt-0.5 size-4 shrink-0" />{okText}</p>;
  return <p className={`flex items-start gap-2 ${neutral ? "text-muted" : "text-danger"}`}><CircleAlert className="mt-0.5 size-4 shrink-0" />{badText}</p>;
}
