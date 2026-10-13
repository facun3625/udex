import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/core/context";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Ingresar · Udex" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSessionUser()) redirect("/");
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold">Udex</h1>
        <p className="mb-6 text-sm text-neutral-500">Ingresá con tu usuario</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
