// Etiquetas de los tipos de movimiento de stock, para el kardex. Módulo puro.
import type { StockMovementType } from "@/generated/prisma/client";

export const MOVEMENT_TYPE_LABEL: Record<StockMovementType, string> = {
  initial: "Carga inicial",
  purchase_receipt: "Ingreso de mercadería",
  purchase_return: "Devolución a proveedor",
  sale: "Venta",
  sale_return: "Devolución de cliente",
  adjustment: "Ajuste manual",
  count: "Conteo",
  transfer_out: "Transferencia (salida)",
  transfer_in: "Transferencia (entrada)",
  kit_assembly: "Armado de kit",
  kit_disassembly: "Desarmado de kit",
};
