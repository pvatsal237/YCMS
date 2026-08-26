import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import { defaultHomePath, isPathAllowed, isPublicPath } from "@/lib/authorization";
import { SESSION_SECONDS } from "@/lib/session-ttl";
import type { UserRole } from "@/types/roles";

export const authConfig = {
  pages: { signIn: "/login" },
  session: {
    strategy: "jwt",
    maxAge: SESSION_SECONDS,
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (isPublicPath(pathname)) return true;
      const role = auth?.user?.role as UserRole | undefined;
      if (!auth?.user || !role) return false;
      if (isPathAllowed(pathname, role)) return true;
      return NextResponse.redirect(new URL(defaultHomePath(role), request.nextUrl.origin));
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.active = user.active;
        token.memberId = user.memberId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.active = Boolean(token.active);
        session.user.memberId = (token.memberId as string | null | undefined) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
