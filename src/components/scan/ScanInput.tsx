"use client";

// Campo de escaneo: el corazón de docs/08-codigos-de-barras.md §4. Pensado para pistola USB/Bluetooth
// en modo teclado (escribe el código y manda Enter) y también para tipear a mano.
//
// - Siempre enfocado: se re-enfoca solo después de cada escaneo (y cuando la pestaña vuelve a estar
//   activa), así nunca hay que tocar el mouse.
// - Multiplicador: tipear "6" + "*" antes de escanear multiplica la próxima lectura por 6 (útil cuando
//   llegan varias unidades del mismo código seguidas).
// - Bip + color: verde/ok o rojo/error, además del resultado visual que decida la pantalla que lo usa.
import { useEffect, useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { beepError, beepOk } from "./beep";
import { cx } from "@/components/ui/cx";

export type ScanFeedback = "idle" | "ok" | "error";

export function ScanInput({
  onScan,
  disabled,
  placeholder = "Escaneá o escribí un código",
}: {
  onScan: (code: string, multiplier: number) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [multiplier, setMultiplier] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<ScanFeedback>("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focus = () => inputRef.current?.focus();

  useEffect(() => {
    focus();
    const onVisible = () => document.visibilityState === "visible" && focus();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  const flash = (ok: boolean) => {
    setFeedback(ok ? "ok" : "error");
    (ok ? beepOk : beepError)();
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback("idle"), 500);
  };

  async function submit() {
    const raw = value.trim();
    if (!raw) return;
    // "6*" solo: queda pendiente, no es un código en sí.
    if (/^\d+\*$/.test(raw)) {
      setMultiplier(Number(raw.slice(0, -1)));
      setValue("");
      return;
    }
    const m = multiplier ?? 1;
    setMultiplier(null);
    setValue("");
    try {
      await onScan(raw, m);
      flash(true);
    } catch {
      flash(false);
    }
    focus();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cx(
          "flex items-center gap-2 rounded-lg border-2 px-3 transition-colors",
          feedback === "ok" && "border-ok bg-ok-soft",
          feedback === "error" && "border-danger bg-danger-soft",
          feedback === "idle" && "border-line bg-surface",
        )}
      >
        <ScanLine className={cx("size-5 shrink-0", feedback === "ok" ? "text-ok" : feedback === "error" ? "text-danger" : "text-muted")} />
        {multiplier !== null && <span className="tabular shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-sm font-semibold text-accent">×{multiplier}</span>}
        <input
          ref={inputRef}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => !disabled && setTimeout(focus, 50)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              setValue("");
              setMultiplier(null);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="h-14 flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
          aria-label="Código de barras o SKU"
        />
      </div>
      <p className="text-xs text-muted">Tipeá un número y <kbd className="rounded bg-surface-2 px-1">*</kbd> antes de escanear para sumar varios de una vez (ej. &quot;6*&quot;).</p>
    </div>
  );
}
