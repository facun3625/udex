import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/core/context";
import { Wordmark } from "@/components/brand/Wordmark";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Ingresar · Udex" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSessionUser()) redirect("/");
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 shadow-sm">
        <Wordmark className="mb-4 h-8 w-auto" />
        <p className="mb-6 text-sm text-muted">Ingresá con tu usuario</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
