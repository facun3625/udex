"use server";

import { requireContext } from "@/modules/core/context";
import { diagnoseScan } from "@/modules/catalog/barcode";

export async function diagnoseScanAction(raw: string) {
  await requireContext(); // solo necesita sesión válida, no un permiso particular
  return diagnoseScan(raw);
}
