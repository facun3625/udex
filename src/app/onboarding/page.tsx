import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/modules/core/context";
import { OnboardingForm } from "./OnboardingForm";

export const metadata = { title: "Nueva empresa · Udex" };

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isSuperadmin) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-surface-2 px-4 py-10">
      <h1 className="text-2xl font-semibold">Nueva empresa</h1>
      <p className="mb-6 text-sm text-muted">
        Datos para facturar y empezar a cargar el catálogo. Se puede completar el resto (domicilio, Ingresos Brutos) después.
      </p>
      <OnboardingForm />
    </main>
  );
}
