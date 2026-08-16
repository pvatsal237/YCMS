import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/passwords";
import { logActivity } from "@/lib/activity-log";
import type { UserRole } from "@/types/roles";

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class DisabledAccountError extends CredentialsSignin {
  code = "disabled";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          throw new InvalidCredentialsError();
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role === "MEMBER" || !user.passwordHash) {
          await logActivity({
            action: "LOGIN_FAILED",
            message: `Failed login attempt for ${email}`,
            metadata: { email },
          });
          throw new InvalidCredentialsError();
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          await logActivity({
            userId: user.id,
            action: "LOGIN_FAILED",
            entityType: "User",
            entityId: user.id,
            message: `Failed login attempt for ${email}`,
          });
          throw new InvalidCredentialsError();
        }

        if (!user.active) {
          await logActivity({
            userId: user.id,
            action: "LOGIN_DISABLED",
            entityType: "User",
            entityId: user.id,
            message: `Disabled account login blocked for ${email}`,
          });
          throw new DisabledAccountError();
        }

        await logActivity({
          userId: user.id,
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          message: `${user.name} signed in`,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
        };
      },
    }),
    Credentials({
      id: "member-otp",
      name: "member-otp",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Code", type: "text" },
        otp: { label: "Code", type: "text" },
        trustDevice: { label: "Trust device", type: "text" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const otp =
          (typeof credentials?.otp === "string" && credentials.otp) ||
          (typeof credentials?.password === "string" && credentials.password) ||
          "";
        const trustDevice = credentials?.trustDevice === "true";
        if (!email || !otp) {
          throw new InvalidCredentialsError();
        }
        try {
          const user = await consumeMemberOtp(email, otp);
          await logActivity({
            userId: user.id,
            action: "MEMBER_LOGIN",
            entityType: "User",
            entityId: user.id,
            message: `${user.name} signed in with email code`,
          });
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as UserRole,
            active: user.active,
            memberId: user.memberId,
            trustDevice,
          };
        } catch {
          throw new InvalidCredentialsError();
        }
      },
    }),
  ],
});
