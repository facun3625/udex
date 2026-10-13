// Rubros que se ofrecen al dar de alta una empresa. Por ahora solo se guarda la elección (Setting
// "industry"); en F2.9 cada rubro precarga atributos, plantillas, unidades y categorías.
export const INDUSTRIES = {
  indumentaria: "Indumentaria y accesorios",
  calzado: "Calzado",
  ferreteria: "Ferretería y materiales",
  almacen: "Almacén, alimentos y bebidas",
  electronica: "Electrónica y tecnología",
  farmacia: "Farmacia y perfumería",
  libreria: "Librería y juguetería",
  autopartes: "Autopartes",
  servicios: "Servicios",
  otro: "Otro / empezar de cero",
} as const;

export type IndustryKey = keyof typeof INDUSTRIES;

export function isIndustry(v: string): v is IndustryKey {
  return Object.prototype.hasOwnProperty.call(INDUSTRIES, v);
}
