// Política de stock negativo por depósito (docs/02-modelo-de-datos.md §1.12). Módulo puro.
import type { NegativeStockPolicy } from "@/generated/prisma/client";

export function allowsNegativeStock(policy: NegativeStockPolicy): boolean {
  return policy !== "block";
}

// "warn": se deja pasar (allowsNegativeStock = true) pero la UI tiene que avisar. `shouldWarn` separa
// ese caso de "allow", que no avisa nada.
export function shouldWarnOnNegative(policy: NegativeStockPolicy): boolean {
  return policy === "warn";
}
