"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteAttributeAction, updateAttributeAction, type AttributeFormState } from "@/app/actions/attributes";
import { ATTRIBUTE_TYPES, hasOptions, type AttributeTypeKey } from "@/modules/catalog/attributeTypes";
import { Badge, Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useConfirm, useToast } from "@/components/ui/Feedback";
import { OptionRow } from "./OptionRow";
import { AddOptionForm } from "./AddOptionForm";

type Option = { id: string; value: string; colorHex: string | null };
type Attribute = { id: string; name: string; type: AttributeTypeKey; options: Option[] };

function EditHeaderForm({ attribute, optionCount, onDone }: { attribute: Attribute; optionCount: number; onDone: () => void }) {
  const [state, action, pending] = useActionState<AttributeFormState, FormData>(updateAttributeAction, {});
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.saved) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDone no cambia entre renders, solo interesa reaccionar a state.saved
  }, [state.saved]);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="attributeId" value={attribute.id} />
      <Field label="Nombre" required className="min-w-40">
        {(p) => <Input {...p} name="name" defaultValue={attribute.name} required autoFocus />}
      </Field>
      <Field label="Tipo" required className="min-w-44">
        {(p) => (
          <Select {...p} name="type" defaultValue={attribute.type} required>
            {Object.entries(ATTRIBUTE_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </Select>
        )}
      </Field>
      <Button
        type="button" // ídem que en ConfirmReceiptForm: si fuera "submit", el requestSubmit() de más
        // abajo volvería a pasar por acá y repetiría el diálogo sin parar.
        size="sm"
        loading={pending}
        onClick={async () => {
          const nextType = new FormData(formRef.current!).get("type");
          const losesOptions = hasOptions(attribute.type) && nextType !== attribute.type && optionCount > 0;
          if (losesOptions) {
            const ok = await confirm({
              title: "¿Cambiar el tipo?",
              message: `Este atributo tiene ${optionCount} opción${optionCount === 1 ? "" : "es"} cargada${optionCount === 1 ? "" : "s"}. Con el nuevo tipo no se van a poder elegir para generar variantes (quedan guardadas, no se pierden).`,
              confirmLabel: "Cambiar igual",
            });
            if (!ok) return;
          }
          formRef.current?.requestSubmit();
        }}
      >
        Guardar
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={onDone}>Cancelar</Button>
      {state.error && <p role="alert" className="w-full text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function AttributeCard({ attribute }: { attribute: Attribute }) {
  const [editingHeader, setEditingHeader] = useState(false);
  const [deleteState, deleteAction, deleting] = useActionState<AttributeFormState, FormData>(deleteAttributeAction, {});
  const confirm = useConfirm();
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (deleteState.error) toast.error(deleteState.error);
  }, [deleteState.error, toast]);

  return (
    <Card className="p-5">
      {editingHeader ? (
        <EditHeaderForm attribute={attribute} optionCount={attribute.options.length} onDone={() => setEditingHeader(false)} />
      ) : (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-medium">{attribute.name}</h2>
            <Badge>{ATTRIBUTE_TYPES[attribute.type]}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setEditingHeader(true)} aria-label={`Editar ${attribute.name}`} className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text">
              <Pencil className="size-4" />
            </button>
            <form ref={deleteFormRef} action={deleteAction}>
              <input type="hidden" name="attributeId" value={attribute.id} />
              <button
                type="button" // ver el comentario en EditHeaderForm: evita el loop de confirmar→requestSubmit→confirmar
                disabled={deleting}
                aria-label={`Eliminar ${attribute.name}`}
                onClick={async () => {
                  const ok = await confirm({ title: `¿Eliminar "${attribute.name}"?`, message: "No se puede deshacer.", confirmLabel: "Eliminar", danger: true });
                  if (ok) deleteFormRef.current?.requestSubmit();
                }}
                className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {hasOptions(attribute.type) && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {attribute.options.map((o) => <OptionRow key={o.id} option={o} isColor={attribute.type === "color"} />)}
            {attribute.options.length === 0 && <p className="text-sm text-muted">Sin opciones.</p>}
          </div>
          <AddOptionForm attributeId={attribute.id} isColor={attribute.type === "color"} />
        </div>
      )}
    </Card>
  );
}
