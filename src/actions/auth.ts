"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { otpRequestSchema, otpVerifySchema } from "@/validations/auth";
import type { ActionResult } from "@/types";
import { assertOtp, isCoordinatorEmail, markOtpConsumed, requestOtp, resolveUserAfterOtp } from "@/services/otp-auth";
import { accountDetectedMessage } from "@/lib/account-detected-message";
import { OTP_GENERIC_INVALID_MESSAGE, normalizeEmail, normalizeOtp } from "@/lib/otp";
import { logServerError, toUserMessage } from "@/lib/errors";
import { defaultHomePath } from "@/lib/authorization";
import { setAuthjsSessionCookie } from "@/lib/auth-session-cookie";
import { canUseDemoBypass, demoBypassRejection, isDemoBypassEmail } from "@/lib/demo-bypass";
import { logSafe } from "@/lib/log";

export async function requestOtpAction(
  _prev: ActionResult<{ devOtp?: string; detectedRoleLabel?: string }>,
  formData: FormData,
): Promise<ActionResult<{ devOtp?: string; detectedRoleLabel?: string }>> {
  const parsed = otpRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email." };
  }
  try {
    const result = await requestOtp(parsed.data.email);
    let detectedRoleLabel: string | undefined;
    try {
      detectedRoleLabel = accountDetectedMessage(Boolean(await isCoordinatorEmail(parsed.data.email))) ?? undefined;
    } catch (error) {
      logServerError("requestOtpAction.roleHint", error);
    }
    return { ok: true, message: result.message, data: { devOtp: result.devOtp, detectedRoleLabel } };
  } catch (error) {
    logServerError("requestOtpAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to send a sign-in code. Please try again.") };
  }
}

export async function verifyOtpAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = otpVerifySchema.safeParse({
    email: formData.get("email"),
    otp: formData.get("otp"),
  });
  if (!parsed.success) {
    logSafe("verify_invalid_input", {
      emailMatches: false,
      recordCreated: false,
      recordFound: false,
      expired: false,
      consumed: false,
      attempts: 0,
      hashMatch: false,
      failingStage: "verify_invalid_input",
      codeLength: normalizeOtp(formData.get("otp")).length,
    });
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const email = normalizeEmail(parsed.data.email);
  const code = parsed.data.otp;
  const next = String(formData.get("next") ?? "");

  let asserted;
  try {
    asserted = await assertOtp(email, code);
  } catch (error) {
    logServerError("verifyOtpAction.assert", error);
    return { ok: false, error: OTP_GENERIC_INVALID_MESSAGE };
  }

  let user;
  try {
    user = await resolveUserAfterOtp(asserted.email);
  } catch (error) {
    logSafe("verify_user_resolve_failed", {
      ...asserted,
      recordCreated: true,
      recordFound: true,
      failingStage: "verify_user_resolve_failed",
      prismaErrorCode: typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : undefined,
    });
    return { ok: false, error: OTP_GENERIC_INVALID_MESSAGE };
  }

  if (!user.active) {
    return { ok: false, error: "This account has been disabled." };
  }

  let sessionVia: "signin" | "cookie" = "signin";
  try {
    const result = await signIn("credentials", {
      email: asserted.email,
      password: code,
      redirect: false,
    });
    if (typeof result === "string" && /[?&]error=/.test(result)) {
      sessionVia = "cookie";
      await setAuthjsSessionCookie(user);
    }
  } catch (error) {
    if (error instanceof AuthError) {
      sessionVia = "cookie";
      try {
        await setAuthjsSessionCookie(user);
      } catch (cookieError) {
        logSafe("session_create_failed", {
          ...asserted,
          recordCreated: true,
          recordFound: true,
          failingStage: "session_create_failed",
        });
        logServerError("verifyOtpAction.session", cookieError);
        return { ok: false, error: OTP_GENERIC_INVALID_MESSAGE };
      }
    } else {
      throw error;
    }
  }

  await markOtpConsumed(asserted.recordId);
  logSafe("session_created", {
    ...asserted,
    recordCreated: true,
    recordFound: true,
    consumed: true,
    failingStage: "session_created",
    sessionVia,
  });

  const home = defaultHomePath(user.role);
  if (next.startsWith("/walk-in") && user.role === "MEMBER") redirect(next);
  redirect(home);
}

export async function demoBypassSignInAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!canUseDemoBypass(email, password)) {
    logSafe("demo.bypass.rejected", { emailMatches: isDemoBypassEmail(email), failingStage: "demo_bypass_rejected" });
    return demoBypassRejection();
  }

  let user;
  try {
    user = await resolveUserAfterOtp(email);
  } catch (error) {
    logSafe("demo.bypass.user_resolve_failed", { emailMatches: true, failingStage: "demo_bypass_user_resolve_failed" });
    logServerError("demoBypassSignInAction.resolve", error);
    return demoBypassRejection();
  }

  if (!user.active) {
    return { ok: false, error: "This account has been disabled." };
  }

  try {
    await setAuthjsSessionCookie(user);
  } catch (error) {
    logSafe("demo.bypass.session_failed", { emailMatches: true, failingStage: "demo_bypass_session_failed" });
    logServerError("demoBypassSignInAction.session", error);
    return demoBypassRejection();
  }

  logSafe("demo.bypass.session_created", { emailMatches: true, failingStage: "demo_bypass_session_created" });
  const home = defaultHomePath(user.role);
  if (next.startsWith("/walk-in") && user.role === "MEMBER") redirect(next);
  redirect(home);
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
