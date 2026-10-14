"use client";

// Avisos (toasts) y diálogo de confirmación, compartidos por todo el panel.
//   const toast = useToast();      toast.ok("Guardado")      toast.error("No se pudo...")
//   const confirm = useConfirm();  if (await confirm({ title: "¿Anular la venta?", danger: true })) ...
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { Button } from "./Button";
import { cx } from "./cx";

type ToastTone = "ok" | "error" | "info";
type ToastItem = { id: number; tone: ToastTone; message: string };
type ConfirmOptions = { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean };

type FeedbackApi = {
  toast: { ok: (m: string) => void; error: (m: string) => void; info: (m: string) => void };
  confirm: (o: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, tone, message }]);
    // Los errores quedan más tiempo: hay que poder leerlos.
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 8000 : 4000);
  }, []);

  const confirm = useCallback(
    (o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })),
    [],
  );

  useEffect(() => {
    if (pending) dialogRef.current?.showModal();
  }, [pending]);

  const close = (value: boolean) => {
    pending?.resolve(value);
    dialogRef.current?.close();
    setPending(null);
  };

  // Memoizado: si este objeto fuera nuevo en cada render (toasts entrando/saliendo cada pocos segundos),
  // cualquier efecto en otro componente que dependa de `toast` o `confirm` se re-dispararía solo porque
  // cambió la referencia, no el contenido — ver docs/07-convenciones.md.
  const api: FeedbackApi = useMemo(
    () => ({ toast: { ok: (m) => push("ok", m), error: (m) => push("error", m), info: (m) => push("info", m) }, confirm }),
    [push, confirm],
  );

  return (
    <FeedbackContext.Provider value={api}>
      {children}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg",
              t.tone === "ok" && "border-ok/30 bg-ok-soft text-ok",
              t.tone === "error" && "border-danger/30 bg-danger-soft text-danger",
              t.tone === "info" && "border-line bg-surface text-text",
            )}
          >
            {t.tone === "ok" ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : t.tone === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button aria-label="Cerrar" onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}>
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          close(false);
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-0 text-text backdrop:bg-black/40"
      >
        {pending && (
          <div className="flex flex-col gap-4 p-6">
            <h2 className="text-lg font-semibold">{pending.title}</h2>
            {pending.message && <p className="text-sm text-muted">{pending.message}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => close(false)}>{pending.cancelLabel ?? "Cancelar"}</Button>
              <Button variant={pending.danger ? "danger" : "primary"} onClick={() => close(true)} autoFocus>
                {pending.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </FeedbackContext.Provider>
  );
}

function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("Falta <FeedbackProvider> (está en el layout del panel)");
  return ctx;
}

export const useToast = () => useFeedback().toast;
export const useConfirm = () => useFeedback().confirm;
