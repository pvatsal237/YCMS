import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { assertOtp, resolveUserAfterOtp } from "@/services/otp-auth";
import { logSafe } from "@/lib/log";
import { normalizeEmail, normalizeOtp } from "@/lib/otp";
import type { UserRole } from "@/types/roles";

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class DisabledAccountError extends CredentialsSignin {
  code = "disabled";
}

function credentialCode(credentials: Record<string, unknown> | undefined) {
  if (!credentials) return "";
  const direct = credentials.password ?? credentials.otp ?? credentials.code;
  const normalized = normalizeOtp(direct);
  if (normalized.length === 6) return String(direct ?? "");
  for (const [key, value] of Object.entries(credentials)) {
    if (key === "email" || key === "callbackUrl" || key === "redirectTo") continue;
    if (normalizeOtp(value).length === 6) return String(value ?? "");
  }
  return String(direct ?? "");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "One-time code", type: "text" },
      },
      async authorize(credentials) {
        const creds = credentials as Record<string, unknown> | undefined;
        const email = normalizeEmail(creds?.email);
        const rawCode = credentialCode(creds);
        const codeLength = normalizeOtp(rawCode).length;
        logSafe("otp.authorize", {
          emailMatches: Boolean(email),
          recordCreated: false,
          recordFound: false,
          expired: false,
          consumed: false,
          attempts: 0,
          hashMatch: false,
          failingStage: codeLength === 6 ? "authorize_received_code" : "authorize_missing_code",
          codeLength,
        });
        if (!email || codeLength !== 6) throw new InvalidCredentialsError();

        try {
          await assertOtp(email, rawCode);
          const user = await resolveUserAfterOtp(email);
          if (!user.active) throw new DisabledAccountError();
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as UserRole,
            active: user.active,
            memberId: user.memberId,
          };
        } catch (error) {
          if (error instanceof DisabledAccountError) throw error;
          throw new InvalidCredentialsError();
        }
      },
    }),
  ],
});
