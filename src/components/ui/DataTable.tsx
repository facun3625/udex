import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { listHref, pageCount, type SearchParams } from "@/lib/listParams";
import { EmptyState } from "./Card";
import { cx } from "./cx";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string; // ej. "hidden md:table-cell" para ocultar en celular
};

// Tabla de listado (server component). Paginación y filtros los resuelve la página con listParams.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: { title: string; description?: string };
}) {
  if (rows.length === 0) {
    return (
      <EmptyState icon={<Inbox className="size-8" />} title={empty?.title ?? "No hay resultados"}>
        {empty?.description}
      </EmptyState>
    );
  }
  const align = (a?: Column<T>["align"]) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-muted uppercase">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cx("px-4 py-2.5 font-medium", align(c.align), c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line last:border-0 hover:bg-surface-2/60">
              {columns.map((c) => (
                <td key={c.key} className={cx("px-4 py-3 align-top", align(c.align), c.className)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ pathname, searchParams, page, perPage, total }: { pathname: string; searchParams: SearchParams; page: number; perPage: number; total: number }) {
  const pages = pageCount(total, perPage);
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  const link = (p: number, label: React.ReactNode, aria: string, disabled: boolean) =>
    disabled ? (
      <span aria-disabled className="flex size-8 items-center justify-center rounded-md text-muted/50">{label}</span>
    ) : (
      <Link href={listHref(pathname, searchParams, { page: p })} aria-label={aria} className="flex size-8 items-center justify-center rounded-md hover:bg-surface-2">
        {label}
      </Link>
    );
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
      <span className="tabular">
        {from}–{to} de {total.toLocaleString("es-AR")}
      </span>
      <div className="flex items-center gap-1">
        {link(page - 1, <ChevronLeft className="size-4" />, "Página anterior", page <= 1)}
        <span className="tabular px-2">{page} / {pages}</span>
        {link(page + 1, <ChevronRight className="size-4" />, "Página siguiente", page >= pages)}
      </div>
    </div>
  );
}
