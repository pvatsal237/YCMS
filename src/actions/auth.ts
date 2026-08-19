"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { loginSchema, memberOtpRequestSchema, memberOtpVerifySchema } from "@/validations/auth";
import { logActivity } from "@/lib/activity-log";
import { getSessionUser } from "@/lib/session";
import type { ActionResult } from "@/types";
import { requestMemberOtp } from "@/services/member-auth";
import { identifyLoginKind } from "@/services/login-identify";
import { OTP_GENERIC_INVALID_MESSAGE } from "@/lib/otp";
import { logServerError, toUserMessage } from "@/lib/errors";

export async function identifyLoginAction(
  _prev: ActionResult<{ kind?: "staff" | "member"; devOtp?: string }>,
  formData: FormData,
): Promise<ActionResult<{ kind?: "staff" | "member"; devOtp?: string }>> {
  const parsed = memberOtpRequestSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email." };
  }
  try {
    const kind = await identifyLoginKind(parsed.data.email);
    if (kind === "staff") {
      return { ok: true, data: { kind: "staff" } };
    }
    if (kind === "member") {
      const result = await requestMemberOtp(parsed.data.email);
      return { ok: true, message: result.message, data: { kind: "member", devOtp: result.devOtp } };
    }
    return { ok: false, error: "We could not find an active account for that email." };
  } catch (error) {
    logServerError("identifyLoginAction", error);
    return {
      ok: false,
      error: toUserMessage(
        error,
        "Unable to continue. Check that the system is available and try again.",
      ),
    };
  }
}

export async function loginAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      loginType: "staff",
      redirectTo: "/dashboard",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      const code = "code" in error ? String(error.code) : error.type;
      if (code === "disabled" || error.message.includes("disabled")) {
        return { ok: false, error: "This account has been disabled. Contact an administrator." };
      }
      return { ok: false, error: "Invalid email or password." };
    }
    throw error;
  }
}

export async function requestMemberOtpAction(
  _prev: ActionResult<{ devOtp?: string }>,
  formData: FormData,
): Promise<ActionResult<{ devOtp?: string }>> {
  const parsed = memberOtpRequestSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    const result = await requestMemberOtp(parsed.data.email);
    return { ok: true, message: result.message, data: { devOtp: result.devOtp } };
  } catch (error) {
    logServerError("requestMemberOtpAction", error);
    return {
      ok: false,
      error: toUserMessage(
        error,
        "Unable to send a sign-in code. Check that PostgreSQL is running and try again.",
      ),
    };
  }
}

export async function verifyMemberOtpAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = memberOtpVerifySchema.safeParse({
    email: formData.get("email"),
    otp: formData.get("otp"),
    trustDevice: formData.get("trustDevice") === "on" || formData.get("trustDevice") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.otp,
      loginType: "member",
      trustDevice: parsed.data.trustDevice ? "true" : "false",
      redirectTo: "/portal",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: OTP_GENERIC_INVALID_MESSAGE };
    }
    throw error;
  }
}

export async function logoutAction() {
  const user = await getSessionUser();
  const redirectTo = user?.role === "MEMBER" ? "/member-login" : "/login";
  if (user) {
    await logActivity({
      userId: user.id,
      action: "LOGOUT",
      entityType: "User",
      entityId: user.id,
      message: `${user.name} signed out`,
    });
  }
  await signOut({ redirectTo });
}
