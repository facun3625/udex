"use client";

// Armazón del panel: menú lateral (cajón en celular), encabezado con empresa/sucursal, paleta Ctrl+K.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronsUpDown, LogOut, Menu, Search, ShieldCheck, X } from "lucide-react";
import { logoutAction } from "@/app/actions/session";
import { activeHref, type MenuItem, type MenuSection } from "@/modules/core/menu";
import type { Theme } from "@/lib/theme";
import { cx } from "@/components/ui/cx";
import { FeedbackProvider } from "@/components/ui/Feedback";
import { MENU_ICONS } from "./icons";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  menu: MenuItem[];
  companyName: string;
  branchName: string;
  canSwitch: boolean;
  user: { name: string; email: string; isSuperadmin: boolean };
  theme: Theme;
  banner?: React.ReactNode;
  children: React.ReactNode;
};

const SECTIONS: MenuSection[] = ["Operación", "Gestión", "Análisis", "Sistema"];

function Nav({ menu, isSuperadmin, onNavigate }: { menu: MenuItem[]; isSuperadmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activeHref(menu, pathname);
  return (
    <nav className="flex flex-col gap-5 px-3 py-4" aria-label="Menú principal">
      {SECTIONS.map((section) => {
        const items = menu.filter((i) => i.section === section);
        if (items.length === 0) return null;
        return (
          <div key={section} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{section}</p>
            {items.map((item) => {
              const Icon = MENU_ICONS[item.icon];
              const content = (
                <>
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {!item.ready && <span className="text-[10px] font-medium text-muted">pronto</span>}
                </>
              );
              const base = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm";
              return item.ready ? (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active === item.href ? "page" : undefined}
                  className={cx(base, active === item.href ? "bg-accent-soft font-medium text-accent" : "text-text hover:bg-surface-2")}
                >
                  {content}
                </Link>
              ) : (
                <span key={item.href} className={cx(base, "cursor-default text-muted/70")}>{content}</span>
              );
            })}
          </div>
        );
      })}
      {isSuperadmin && (
        <div className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">Soporte</p>
          <Link href="/superadmin/licencia" onClick={onNavigate} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text hover:bg-surface-2">
            <ShieldCheck className="size-4" /> Licencia
          </Link>
        </div>
      )}
    </nav>
  );
}

function CommandPalette({ menu, open, onClose }: { menu: MenuItem[]; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const results = useMemo(() => {
    const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    return menu.filter((i) => i.ready && norm(i.label).includes(norm(q)));
  }, [menu, q]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  // Al cerrar se limpia la búsqueda, así la próxima vez abre vacía.
  const close = () => {
    setQ("");
    setIndex(0);
    onClose();
  };
  const go = (href: string) => {
    close();
    router.push(href);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={close}
      onClick={(e) => e.target === dialogRef.current && close()}
      className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-lg rounded-xl border border-line bg-surface p-0 text-text shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-center gap-2 border-b border-line px-4">
        <Search className="size-4 text-muted" />
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[index]) go(results[index].href);
          }}
          placeholder="Ir a... (pronto: productos, clientes, ventas)"
          className="h-12 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          aria-label="Buscar"
        />
      </div>
      <ul className="max-h-80 overflow-y-auto p-2">
        {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Sin resultados</li>}
        {results.map((item, i) => {
          const Icon = MENU_ICONS[item.icon];
          return (
            <li key={item.href}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(item.href)}
                className={cx("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm", i === index && "bg-surface-2")}
              >
                <Icon className="size-4 text-muted" /> {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}

export function PanelShell({ menu, companyName, branchName, canSwitch, user, theme, banner, children }: Props) {
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const brand = (
    <Link href="/" className="flex h-14 items-center px-6">
      <Wordmark className="h-6 w-auto" />
    </Link>
  );

  return (
    <FeedbackProvider>
      <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
        <aside className="sticky top-0 hidden h-screen overflow-y-auto border-r border-line bg-surface md:block">
          {brand}
          <Nav menu={menu} isSuperadmin={user.isSuperadmin} />
        </aside>

        {drawer && (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menú">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] overflow-y-auto bg-surface shadow-xl">
              <div className="flex items-center justify-between pr-3">
                {brand}
                <button aria-label="Cerrar menú" onClick={() => setDrawer(false)} className="flex size-9 items-center justify-center rounded-lg hover:bg-surface-2">
                  <X className="size-5" />
                </button>
              </div>
              <Nav menu={menu} isSuperadmin={user.isSuperadmin} onNavigate={() => setDrawer(false)} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur md:px-6">
            <button aria-label="Abrir menú" onClick={() => setDrawer(true)} className="flex size-9 items-center justify-center rounded-lg hover:bg-surface-2 md:hidden">
              <Menu className="size-5" />
            </button>

            {canSwitch ? (
              <Link href="/seleccionar" title="Cambiar de empresa o sucursal" className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                <Building2 className="size-4 shrink-0 text-muted" />
                <span className="truncate text-sm"><span className="font-medium">{companyName}</span><span className="text-muted"> · {branchName}</span></span>
                <ChevronsUpDown className="size-3.5 shrink-0 text-muted" />
              </Link>
            ) : (
              <div className="flex min-w-0 items-center gap-2 px-2 text-sm">
                <Building2 className="size-4 shrink-0 text-muted" />
                <span className="truncate"><span className="font-medium">{companyName}</span><span className="text-muted"> · {branchName}</span></span>
              </div>
            )}

            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setPalette(true)} className="hidden h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm text-muted hover:bg-surface-2 sm:flex">
                <Search className="size-4" /> Buscar <kbd className="rounded bg-surface-2 px-1.5 text-[11px]">Ctrl K</kbd>
              </button>
              <button aria-label="Buscar" onClick={() => setPalette(true)} className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 sm:hidden">
                <Search className="size-4" />
              </button>
              <ThemeToggle initial={theme} />
              <div className="ml-1 hidden text-right leading-tight lg:block">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted">{user.email}</p>
              </div>
              <form action={logoutAction}>
                <button type="submit" title="Salir" aria-label="Salir" className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text">
                  <LogOut className="size-4" />
                </button>
              </form>
            </div>
          </header>

          {banner}
          <main className="flex-1 px-4 py-6 md:px-8">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
      <CommandPalette menu={menu} open={palette} onClose={() => setPalette(false)} />
    </FeedbackProvider>
  );
}
