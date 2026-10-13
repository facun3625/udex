"use client";

// Controles de filtro de un listado: escriben en la URL (la página server-side vuelve a consultar).
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { cx } from "./cx";

function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page"); // cambiar un filtro vuelve a la página 1
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return { set, params, pending };
}

export function SearchBox({ placeholder = "Buscar...", param = "q" }: { placeholder?: string; param?: string }) {
  const { set, params, pending } = useSetParam();
  const [value, setValue] = useState(params.get(param) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <label className="relative block w-full sm:w-auto sm:max-w-xs sm:flex-1">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          const v = e.target.value.trim();
          timer.current = setTimeout(() => set(param, v), 300);
        }}
        className={cx("input pl-9", pending && "opacity-70")}
      />
    </label>
  );
}

export function FilterSelect({ param, label, options }: { param: string; label: string; options: { value: string; label: string }[] }) {
  const { set, params } = useSetParam();
  return (
    <label className="block w-full sm:w-auto">
      <span className="sr-only">{label}</span>
      <select value={params.get(param) ?? ""} onChange={(e) => set(param, e.target.value)} className="input pr-8">
        <option value="">{label}: todos</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
