import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authConfig } from "@/auth.config";
import { syncGoogleUser } from "@/lib/google-user";
import type { UserRole } from "@/types/roles";

const googleId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  ...authConfig,
  providers: [
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "google" && profile) {
        const synced = await syncGoogleUser({
          email: profile.email,
          name: profile.name,
          given_name: (profile as { given_name?: string }).given_name,
          family_name: (profile as { family_name?: string }).family_name,
          picture: (profile as { picture?: string }).picture,
        });
        token.id = synced.id;
        token.role = synced.role;
        token.active = synced.active;
        token.memberId = synced.memberId;
        token.picture = synced.image;
        token.name = synced.name;
        token.email = synced.email;
        return token;
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
