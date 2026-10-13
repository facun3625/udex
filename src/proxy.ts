import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Todo el sistema requiere sesión salvo estas rutas. El chequeo fino (usuario activo, permisos, empresa)
// lo hace requireContext() en cada página/acción: acá solo se manda al login a quien no tiene sesión.
const PUBLIC_PATHS = ["/login", "/api/health"];
const PUBLIC_PREFIXES = ["/api/auth/"];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  if (isPublic || req.auth) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const login = new URL("/login", req.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
