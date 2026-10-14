"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createAttributeAction, type AttributeFormState } from "@/app/actions/attributes";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ATTRIBUTE_TYPES, hasOptions, type AttributeTypeKey } from "@/modules/catalog/attributeTypes";

export function NewAttributeForm() {
  const [state, action, pending] = useActionState<AttributeFormState, FormData>(createAttributeAction, {});
  const [type, setType] = useState<AttributeTypeKey>("select");
  const formRef = useRef<HTMLFormElement>(null);

  // Los campos son no controlados (uncontrolled): después de crear uno, la página se revalida pero este
  // componente sigue siendo el mismo (no remonta solo), así que el nombre y las opciones quedarían
  // cargados con lo anterior si no se limpian a mano acá.
  useEffect(() => {
    if (state.saved) {
      formRef.current?.reset();
      setType("select");
    }
  }, [state.saved]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" required hint='Ej: "Talle", "Color"'>
          {(p) => <Input {...p} name="name" required autoFocus />}
        </Field>
        <Field label="Tipo" required>
          {(p) => (
            <Select {...p} name="type" required value={type} onChange={(e) => setType(e.target.value as AttributeTypeKey)}>
              {Object.entries(ATTRIBUTE_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </Select>
          )}
        </Field>
      </div>
      {hasOptions(type) && (
        <Field label="Opciones" required hint={type === "color" ? 'Una por línea. Para fijar el color: "Negro #000000"' : "Una por línea"}>
          {(p) => <Textarea {...p} name="options" rows={4} placeholder={type === "color" ? "Negro #000000\nBlanco #ffffff" : "S\nM\nL"} />}
        </Field>
      )}
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.saved && <p role="status" className="text-sm text-ok">Atributo creado.</p>}
      <Button type="submit" loading={pending} className="self-start">Crear atributo</Button>
    </form>
  );
}
