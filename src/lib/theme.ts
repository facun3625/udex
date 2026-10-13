// Tema claro/oscuro. Se guarda en una cookie (no en localStorage) para que el servidor pinte la página
// ya con el tema correcto y no haya parpadeo. "system" sigue la configuración del dispositivo.
export type Theme = "light" | "dark" | "system";
export const THEME_COOKIE = "udex_theme";

export function parseTheme(value: string | undefined): Theme {
  return value === "light" || value === "dark" ? value : "system";
}

// Script que corre antes de pintar cuando el tema es "system".
export const SYSTEM_THEME_SCRIPT = `try{if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark')}catch(e){}`;
