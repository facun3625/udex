"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { removeAttributeOptionAction, updateAttributeOptionAction, type AttributeFormState } from "@/app/actions/attributes";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Feedback";

type Option = { id: string; value: string; colorHex: string | null };

export function OptionRow({ option, isColor }: { option: Option; isColor: boolean }) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updating] = useActionState<AttributeFormState, FormData>(updateAttributeOptionAction, {});
  const [removeState, removeAction, removing] = useActionState<AttributeFormState, FormData>(removeAttributeOptionAction, {});
  const toast = useToast();

  // El chip no tiene lugar para un mensaje de error largo ("ya se usa en 3 variantes"): va por toast.
  useEffect(() => {
    if (removeState.error) toast.error(removeState.error);
  }, [removeState.error, toast]);

  useEffect(() => {
    if (updateState.saved) setEditing(false);
  }, [updateState.saved]);

  if (editing) {
    return (
      <form action={updateAction} className="flex flex-wrap items-center gap-1.5 rounded-md border border-accent bg-accent-soft py-1 pr-1 pl-2">
        <input type="hidden" name="optionId" value={option.id} />
        <Input name="value" defaultValue={option.value} required autoFocus className="h-7 w-28 px-1.5 py-0" />
        {isColor && <input type="color" name="colorHex" defaultValue={option.colorHex ?? "#000000"} className="h-7 w-8 rounded border border-line" title="Color" />}
        <Button type="submit" size="sm" loading={updating} className="h-7 px-2 text-xs">Guardar</Button>
        <button type="button" onClick={() => setEditing(false)} className="px-1 text-xs text-muted underline">Cancelar</button>
        {updateState.error && <p role="alert" className="w-full text-xs text-danger">{updateState.error}</p>}
      </form>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 py-1 pr-1 pl-2.5 text-sm">
      {option.colorHex && <span className="size-3 rounded-full border border-line" style={{ background: option.colorHex }} />}
      {option.value}
      <button type="button" onClick={() => setEditing(true)} aria-label={`Editar ${option.value}`} className="flex size-5 items-center justify-center rounded text-muted hover:bg-surface hover:text-text">
        <Pencil className="size-3" />
      </button>
      <form action={removeAction}>
        <input type="hidden" name="optionId" value={option.id} />
        <button type="submit" disabled={removing} aria-label={`Quitar ${option.value}`} className="flex size-5 items-center justify-center rounded text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50">
          <X className="size-3" />
        </button>
      </form>
    </span>
  );
}
