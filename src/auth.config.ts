import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import { defaultHomePath, isPathAllowed, isPublicPath } from "@/lib/authorization";
import type { UserRole } from "@/types/roles";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 14,
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
        token.picture = user.image;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.active = Boolean(token.active);
        session.user.memberId = (token.memberId as string | null | undefined) ?? null;
        session.user.image = (token.picture as string | undefined) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
