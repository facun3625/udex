"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Theme, string> = { system: "Tema del dispositivo", light: "Tema claro", dark: "Tema oscuro" };

export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <button
      type="button"
      title={`${LABEL[theme]} (clic para cambiar)`}
      aria-label={LABEL[theme]}
      onClick={() => {
        const next = NEXT[theme];
        setTheme(next);
        document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        const dark = next === "dark" || (next === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
        document.documentElement.classList.toggle("dark", dark);
      }}
      className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
    >
      <Icon className="size-4" />
    </button>
  );
}
