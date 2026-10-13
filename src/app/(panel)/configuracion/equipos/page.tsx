import { requireContext } from "@/modules/core/context";
import { Card, PageHeader } from "@/components/ui/Card";
import { ScanTester } from "./ScanTester";

export const metadata = { title: "Probar lector · Udex" };

export default async function ScanTesterPage() {
  await requireContext();
  return (
    <div className="max-w-xl">
      <PageHeader title="Probar lector de código de barras" description="Conectá la pistola a esta computadora y escaneá cualquier producto (no hace falta que exista en el catálogo)." />
      <Card className="p-5">
        <ScanTester />
      </Card>
    </div>
  );
}
