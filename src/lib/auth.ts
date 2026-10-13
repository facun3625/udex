import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginThrottle } from "@/lib/loginThrottle";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 }, // un turno de trabajo
  pages: { signIn: "/login" },
  // Self-hosteado atrás de Nginx (igual que corto): sin esto NextAuth rechaza el Host ("UntrustedHost").
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        if (loginThrottle.isLocked(email)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        const valid = !!user && user.active && (await bcrypt.compare(password, user.passwordHash));
        if (!valid) {
          loginThrottle.fail(email);
          return null;
        }
        loginThrottle.succeed(email);
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    // El JWT solo guarda el id. Permisos, superadmin y estado se leen de la base en cada pedido
    // (modules/core/context.ts): así desactivar un usuario o cambiarle el rol corta el acceso al instante.
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return typeof token.id === "string" ? token : null;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") session.user.id = token.id;
      return session;
    },
  },
});
