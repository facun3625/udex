// Tipos de atributo que ofrece la empresa al crear uno nuevo. Módulo puro.
export const ATTRIBUTE_TYPES = {
  select: "Lista (ej. Talle)",
  color: "Color (ej. Negro, Blanco)",
  text: "Texto libre",
  number: "Número",
  boolean: "Sí / No",
} as const;

export type AttributeTypeKey = keyof typeof ATTRIBUTE_TYPES;

export function isAttributeType(v: string): v is AttributeTypeKey {
  return Object.prototype.hasOwnProperty.call(ATTRIBUTE_TYPES, v);
}

// Solo "select" y "color" tienen una lista de opciones (de ahí salen los ejes de variante). "text",
// "number" y "boolean" quedan reservados para cuando haya atributos descriptivos (F2.2) — hoy el
// generador de variantes no los usa.
export function hasOptions(type: AttributeTypeKey): boolean {
  return type === "select" || type === "color";
}
