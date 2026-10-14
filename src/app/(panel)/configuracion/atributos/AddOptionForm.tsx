"use client";

import { useActionState, useEffect, useRef } from "react";
import { addAttributeOptionAction, type AttributeFormState } from "@/app/actions/attributes";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function AddOptionForm({ attributeId, isColor }: { attributeId: string; isColor: boolean }) {
  const [state, action, pending] = useActionState<AttributeFormState, FormData>(addAttributeOptionAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.saved) formRef.current?.reset();
  }, [state.saved]);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="attributeId" value={attributeId} />
      <Input name="value" placeholder="Valor nuevo" required className="max-w-40" />
      {isColor && <input type="color" name="colorHex" defaultValue="#000000" className="h-10 w-12 rounded-lg border border-line" title="Color" />}
      <Button type="submit" size="sm" variant="secondary" loading={pending}>Agregar</Button>
      {state.error && <p role="alert" className="w-full text-sm text-danger">{state.error}</p>}
    </form>
  );
}
