"use client";

// Botones de plantillas de talles estándar (docs: modules/catalog/sizePresets.ts): insertan sus valores
// en el textarea de opciones de un clic, sin pisar lo que la persona ya haya escrito a mano.
import { SIZE_PRESETS } from "@/modules/catalog/sizePresets";

export function SizePresetPicker({ textareaId }: { textareaId: string }) {
  function applyPreset(values: string[]) {
    const el = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    if (!el) return;
    const current = el.value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const existing = new Set(current.map((v) => v.toLowerCase()));
    const merged = [...current, ...values.filter((v) => !existing.has(v.toLowerCase()))];
    // Se actualiza vía el setter nativo para que React detecte el cambio (igual que si la persona tipeara).
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!;
    setter.call(el, merged.join("\n"));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted">Plantillas:</span>
      {SIZE_PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => applyPreset(p.values)}
          className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-accent hover:bg-accent-soft hover:text-accent"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
