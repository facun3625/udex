// Motivos de un ajuste manual de stock (F1.6). Módulo puro.
export const ADJUSTMENT_REASONS = {
  breakage: "Rotura",
  theft: "Robo / faltante",
  gift: "Obsequio / promoción",
  count_error: "Corrección de un error de carga",
  other: "Otro",
} as const;

export type AdjustmentReason = keyof typeof ADJUSTMENT_REASONS;

export function isAdjustmentReason(v: string): v is AdjustmentReason {
  return Object.prototype.hasOwnProperty.call(ADJUSTMENT_REASONS, v);
}
