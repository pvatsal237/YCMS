import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { consumeOtp } from "@/services/otp-auth";
import { logSafe } from "@/lib/log";
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
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const otp = typeof credentials?.otp === "string" ? credentials.otp : "";
        if (!email || !otp) throw new InvalidCredentialsError();

        try {
          const user = await consumeOtp(email, otp);
          if (!user.active) throw new DisabledAccountError();
          logSafe("login.success", { userId: user.id, role: user.role });
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as UserRole,
            active: user.active,
            memberId: user.memberId,
          };
        } catch (error) {
          logSafe("login.failed", { emailDomain: email.split("@")[1] ?? "" });
          if (error instanceof DisabledAccountError) throw error;
          throw new InvalidCredentialsError();
        }
      },
    }),
  ],
});
