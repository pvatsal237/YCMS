import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authConfig } from "@/auth.config";
import { syncGoogleUser } from "@/lib/google-user";
import { logServerError } from "@/lib/errors";
import type { UserRole } from "@/types/roles";

const secret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
const googleId = process.env.AUTH_GOOGLE_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim();
const googleSecret =
  process.env.AUTH_GOOGLE_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim();
const authUrl = process.env.AUTH_URL?.trim();

if (!secret || !googleId || !googleSecret) {
  console.error("[IYCM auth] configuration incomplete", {
    AUTH_SECRET: Boolean(secret),
    AUTH_GOOGLE_ID: Boolean(googleId),
    AUTH_GOOGLE_SECRET: Boolean(googleSecret),
    AUTH_URL: Boolean(authUrl),
  });
}

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
      const type = "type" in error ? String(error.type) : error.name;
      const cause =
        error instanceof Error && error.cause instanceof Error ? error.cause.name : undefined;
      console.error("[IYCM auth] Auth.js callback exception", { type, cause });
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      console.info("[IYCM auth] signIn callback start", {
        provider: account.provider,
        hasEmail: Boolean(profile?.email),
      });
      console.info("[IYCM auth] signIn callback end");
      return true;
    },
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "google") {
        console.info("[IYCM auth] jwt Google sync start");
        try {
          const synced = await syncGoogleUser({
            email: profile?.email ?? (typeof token.email === "string" ? token.email : null),
            name: profile?.name ?? (typeof token.name === "string" ? token.name : null),
            given_name: (profile as { given_name?: string } | undefined)?.given_name,
            family_name: (profile as { family_name?: string } | undefined)?.family_name,
            picture: (profile as { picture?: string } | undefined)?.picture,
          });
          token.id = synced.id;
          token.role = synced.role;
          token.active = synced.active;
          token.memberId = synced.memberId;
          token.picture = synced.image;
          token.name = synced.name;
          token.email = synced.email;
          console.info("[IYCM auth] jwt Google sync end", { role: synced.role });
          return token;
        } catch (error) {
          console.error("[IYCM auth] jwt Google sync failed");
          logServerError("googleJwtSync", error);
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
