import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authConfig } from "@/auth.config";
import { syncGoogleUser } from "@/lib/google-user";
import { logServerError } from "@/lib/errors";
import type { UserRole } from "@/types/roles";

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

const googleId = readEnv("AUTH_GOOGLE_ID") ?? readEnv("GOOGLE_CLIENT_ID");
const googleSecret = readEnv("AUTH_GOOGLE_SECRET") ?? readEnv("GOOGLE_CLIENT_SECRET");

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  ...authConfig,
  providers: [
    Google({
      ...(googleId ? { clientId: googleId } : {}),
      ...(googleSecret ? { clientSecret: googleSecret } : {}),
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  logger: {
    error(error) {
      const name = error instanceof Error ? error.name : "Error";
      const type = typeof error === "object" && error && "type" in error ? String(error.type) : "";
      console.error("[IYCM auth]", type || name);
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "google") {
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
          return token;
        } catch (error) {
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
