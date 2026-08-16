import type { NextAuthConfig } from "next-auth";
import { isPathAllowed, isPublicPath } from "@/lib/authorization";
import { STAFF_SESSION_SECONDS, TRUSTED_MEMBER_SESSION_SECONDS } from "@/lib/session-ttl";
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
    maxAge: TRUSTED_MEMBER_SESSION_SECONDS,
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (isPublicPath(pathname)) {
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
        token.memberId = user.memberId ?? null;
        const now = Math.floor(Date.now() / 1000);
        const trusted = user.role === "MEMBER" && Boolean(user.trustDevice);
        token.exp = now + (trusted ? TRUSTED_MEMBER_SESSION_SECONDS : STAFF_SESSION_SECONDS);
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
