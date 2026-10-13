// Parámetros de listados (página, búsqueda, filtros) leídos de la URL. Todos los listados del panel se
// paginan y filtran en el servidor con esto: la URL es el estado (se puede compartir, el "atrás" anda).
// Módulo puro.

export type SearchParams = Record<string, string | string[] | undefined>;

export type ListParams = {
  page: number; // 1..n
  perPage: number;
  skip: number;
  take: number;
  q: string; // búsqueda libre, recortada
  get: (key: string) => string; // filtro por nombre ("" si no está)
};

export const PER_PAGE_OPTIONS = [25, 50, 100] as const;

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function parseListParams(sp: SearchParams, defaults: { perPage?: number } = {}): ListParams {
  const perPageRaw = Number(first(sp.perPage));
  const perPage = (PER_PAGE_OPTIONS as readonly number[]).includes(perPageRaw) ? perPageRaw : (defaults.perPage ?? 25);
  const pageRaw = Math.trunc(Number(first(sp.page)));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  return {
    page,
    perPage,
    skip: (page - 1) * perPage,
    take: perPage,
    q: first(sp.q).trim().slice(0, 200),
    get: (key) => first(sp[key]).trim(),
  };
}

export function pageCount(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage));
}

// Arma el href del mismo listado cambiando algunos parámetros (null = quitarlo). Cambiar un filtro
// vuelve a la página 1 salvo que se pase `page` explícitamente.
export function listHref(pathname: string, sp: SearchParams, changes: Record<string, string | number | null>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = first(v);
    if (val !== "") params.set(k, val);
  }
  if (!("page" in changes)) params.delete("page");
  for (const [k, v] of Object.entries(changes)) {
    if (v === null || v === "" || (k === "page" && Number(v) === 1)) params.delete(k);
    else params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
