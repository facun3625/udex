"use client";

// Crear una categoría nueva desde el producto. Va en un <dialog> aparte (no un <form> metido dentro del
// <form> de "Datos generales": el HTML no admite formularios anidados) y se porta directo a <body> para
// que, pase lo que pase en el árbol de React, nunca termine siendo descendiente de otro <form>.
import { useActionState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createCategoryAction, type ProductFormState } from "@/app/actions/products";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function NewCategoryDialog({ productId, onClose }: { productId: string; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ProductFormState, FormData>(createCategoryAction, {});
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (state.saved) {
      router.refresh(); // trae la categoría nueva ya asignada al producto
      onClose();
    }
    // onClose/router son estables entre renders; solo nos interesa reaccionar a que se guarde.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.saved]);

  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-line bg-surface p-0 text-text shadow-2xl backdrop:bg-black/40"
    >
      <form action={action} className="flex flex-col gap-4 p-6">
        <input type="hidden" name="productId" value={productId} />
        <h2 className="text-lg font-semibold">Categoría nueva</h2>
        <Field label="Nombre" required>{(p) => <Input {...p} name="name" required autoFocus placeholder="Ej: Indumentaria" />}</Field>
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pending}>Crear y asignar</Button>
        </div>
      </form>
    </dialog>,
    document.body,
  );
}
