"use client";

import { useState } from "react";
import { parseDecimalInput } from "@/lib/money";
import { cx } from "./cx";

// Campo para importes y cantidades en formato argentino ("1.234,56"). Manda al servidor el valor
// normalizado ("1234.56") en un input oculto con `name`; el servidor igual lo vuelve a validar.
export function DecimalInput({
  name,
  defaultValue = "",
  className,
  onValueChange,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue" | "type"> & {
  name: string;
  defaultValue?: string;
  onValueChange?: (normalized: string | null) => void;
}) {
  const [raw, setRaw] = useState(defaultValue);
  const parsed = raw.trim() === "" ? null : parseDecimalInput(raw);
  const invalid = raw.trim() !== "" && parsed === null;
  return (
    <>
      <input
        {...rest}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          const p = e.target.value.trim() === "" ? null : parseDecimalInput(e.target.value);
          onValueChange?.(p ? p.toString() : null);
        }}
        aria-invalid={invalid || rest["aria-invalid"] || undefined}
        className={cx("input tabular text-right", invalid && "border-danger", className)}
      />
      <input type="hidden" name={name} value={parsed ? parsed.toString() : ""} />
    </>
  );
}
