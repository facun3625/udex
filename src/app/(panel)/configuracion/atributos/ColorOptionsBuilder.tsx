"use client";

// Constructor de opciones para atributos de tipo "color": una fila por color, con un selector de color
// nativo (en Chrome/Edge/Safari ya trae gotero y campo para pegar el código hex, no hace falta
// reinventarlo) + el nombre. Arma el mismo formato "Nombre #hex" por línea que ya entiende el server
// (modules/catalog -> parseOptionsText en actions/attributes.ts) en un input oculto, así no hace falta
// tocar la validación del servidor.
import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const PALETTE = ["#000000", "#ffffff", "#dc2626", "#2563eb", "#16a34a", "#eab308", "#9333ea", "#78716c"];

type Row = { id: string; value: string; colorHex: string };
let seq = 0;
const newRow = (value = "", colorHex = "#000000"): Row => ({ id: `r${seq++}`, value, colorHex });

export function ColorOptionsBuilder({ name = "options" }: { name?: string }) {
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const id = useId();

  const serialized = rows
    .filter((r) => r.value.trim())
    .map((r) => `${r.value.trim()} ${r.colorHex}`)
    .join("\n");

  const update = (rowId: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={serialized} />
      {rows.map((row, i) => (
        <div key={row.id} className="flex items-center gap-2">
          <input
            type="color"
            value={row.colorHex}
            onChange={(e) => update(row.id, { colorHex: e.target.value })}
            title="Elegí el color (con gotero o pegando el código)"
            className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line p-0.5"
          />
          <Input
            value={row.value}
            onChange={(e) => update(row.id, { value: e.target.value })}
            placeholder="Negro"
            aria-label={`Nombre del color ${i + 1}`}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== row.id) : rs))}
            aria-label="Quitar este color"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={() => setRows((rs) => [...rs, newRow()])}>
          <Plus className="size-3.5" /> Agregar color
        </Button>
        <span className="text-xs text-muted">o elegí uno común:</span>
        {PALETTE.map((hex) => (
          <button
            key={hex}
            type="button"
            title={hex}
            onClick={() => setRows((rs) => [...rs, newRow("", hex)])}
            className="size-6 rounded-full border border-line"
            style={{ background: hex }}
            aria-label={`Agregar color ${hex}`}
          />
        ))}
      </div>
      <p id={`${id}-hint`} className="text-xs text-muted">
        Tocá el cuadrado de color para elegirlo con el selector del sistema (tiene gotero para sacarlo de una imagen, y también podés pegar el código).
      </p>
    </div>
  );
}
