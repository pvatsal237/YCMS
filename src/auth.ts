import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authConfig } from "@/auth.config";
import { logAuthStageFailure, syncGoogleUser } from "@/lib/google-user";
import type { UserRole } from "@/types/roles";

const secret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
const googleId = process.env.AUTH_GOOGLE_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim();
const googleSecret =
  process.env.AUTH_GOOGLE_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  secret,
  basePath: "/api/auth",
  providers: [
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  logger: {
    error(error) {
      logAuthStageFailure("Auth.js callback exception", error);
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") return true;
      const email = typeof profile?.email === "string" ? profile.email : user?.email;
      if (!email) {
        logAuthStageFailure("signIn callback", new Error("MissingEmail"));
        return false;
      }
      return true;
    },
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "google") {
        try {
          const synced = await syncGoogleUser({
            email:
              (typeof profile?.email === "string" && profile.email) ||
              user?.email ||
              (typeof token.email === "string" ? token.email : null),
            name:
              (typeof profile?.name === "string" && profile.name) ||
              user?.name ||
              (typeof token.name === "string" ? token.name : null),
            given_name: (profile as { given_name?: string } | undefined)?.given_name,
            family_name: (profile as { family_name?: string } | undefined)?.family_name,
            picture:
              (profile as { picture?: string } | undefined)?.picture ?? user?.image ?? null,
          });
          token.id = synced.id;
          token.role = synced.role;
          token.active = synced.active;
          token.memberId = synced.memberId ?? null;
          token.picture = synced.image ?? null;
          token.name = synced.name;
          token.email = synced.email;
          return token;
        } catch (error) {
          logAuthStageFailure("jwt Google sync", error);
          throw error;
        }
      }
      return authConfig.callbacks.jwt({ token, user, account, profile });
    },
    async session({ session, token }) {
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
});
