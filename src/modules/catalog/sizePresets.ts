// Plantillas de talles estándar de Argentina, para no tener que tipearlos a mano cada vez. Módulo puro
// (solo datos). Se insertan en el atributo "select" con un clic; la persona los puede editar después.
export type SizePreset = { key: string; label: string; values: string[] };

export const SIZE_PRESETS: SizePreset[] = [
  { key: "ropa_letras", label: "Ropa (XS–XXL)", values: ["XS", "S", "M", "L", "XL", "XXL"] },
  { key: "calzado_adulto", label: "Calzado adulto (AR)", values: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"] },
  { key: "calzado_nino", label: "Calzado niño (AR)", values: ["20", "22", "24", "26", "28", "30", "32", "33", "34"] },
  { key: "ninos_edad", label: "Niños por edad", values: ["2", "4", "6", "8", "10", "12", "14", "16"] },
  { key: "bebes_meses", label: "Bebés (meses)", values: ["0-3M", "3-6M", "6-9M", "9-12M", "12-18M", "18-24M"] },
  { key: "pantalon_cintura", label: "Pantalón (cintura, cm)", values: ["38", "40", "42", "44", "46", "48", "50", "52"] },
];

export function findSizePreset(key: string): SizePreset | undefined {
  return SIZE_PRESETS.find((p) => p.key === key);
}
