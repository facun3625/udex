"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createAttributeAction, type AttributeFormState } from "@/app/actions/attributes";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ATTRIBUTE_TYPES, hasOptions, type AttributeTypeKey } from "@/modules/catalog/attributeTypes";
import { ColorOptionsBuilder } from "./ColorOptionsBuilder";
import { SizePresetPicker } from "./SizePresetPicker";

export function NewAttributeForm() {
  const [state, action, pending] = useActionState<AttributeFormState, FormData>(createAttributeAction, {});
  const [type, setType] = useState<AttributeTypeKey>("select");
  const formRef = useRef<HTMLFormElement>(null);

  // Los campos son no controlados: después de crear uno, la página se revalida pero este componente
  // sigue siendo el mismo (no remonta solo), así que quedarían cargados con lo anterior si no se
  // limpian a mano acá (ver docs/07-convenciones.md).
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

      {type === "color" && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Colores <span className="text-danger">*</span>
          </label>
          <ColorOptionsBuilder key={state.saved ? "reset" : "editing"} />
        </div>
      )}

      {hasOptions(type) && type !== "color" && (
        <Field label="Opciones" required hint="Una por línea">
          {(p) => (
            <div className="flex flex-col gap-2">
              {type === "select" && <SizePresetPicker textareaId={p.id} />}
              <Textarea {...p} name="options" rows={4} placeholder={"S\nM\nL"} />
            </div>
          )}
        </Field>
      )}

      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.saved && <p role="status" className="text-sm text-ok">Atributo creado.</p>}
      <Button type="submit" loading={pending} className="self-start">Crear atributo</Button>
    </form>
  );
}
