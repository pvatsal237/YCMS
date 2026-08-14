import type { NextAuthConfig } from "next-auth";
import { isPathAllowed } from "@/lib/authorization";
import type { UserRole } from "@/types/roles";

/**
 * Edge-safe Auth.js config. Do not import Prisma here.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname === "/unauthorized"
      ) {
        return true;
      }

      const role = auth?.user?.role as UserRole | undefined;
      if (!auth?.user || !role) {
        return false;
      }

      return isPathAllowed(pathname, role);
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.active = user.active;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.active = Boolean(token.active);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
