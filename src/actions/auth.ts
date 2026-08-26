"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { otpRequestSchema, otpVerifySchema } from "@/validations/auth";
import type { ActionResult } from "@/types";
import { requestOtp } from "@/services/otp-auth";
import { OTP_GENERIC_INVALID_MESSAGE } from "@/lib/otp";
import { logServerError, toUserMessage } from "@/lib/errors";
import { defaultHomePath } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function requestOtpAction(
  _prev: ActionResult<{ devOtp?: string }>,
  formData: FormData,
): Promise<ActionResult<{ devOtp?: string }>> {
  const parsed = otpRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email." };
  }
  try {
    const result = await requestOtp(parsed.data.email);
    return { ok: true, message: result.message, data: { devOtp: result.devOtp } };
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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const email = parsed.data.email.trim().toLowerCase();
  const next = String(formData.get("next") ?? "");
  try {
    await signIn("credentials", {
      email,
      password: parsed.data.otp,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, error: OTP_GENERIC_INVALID_MESSAGE };
    throw error;
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  const home = user ? defaultHomePath(user.role) : "/login";
  if (next.startsWith("/walk-in") && user?.role === "MEMBER") redirect(next);
  redirect(home);
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
