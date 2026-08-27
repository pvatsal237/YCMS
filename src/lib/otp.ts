import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export type OtpPepperSource = "AUTH_SECRET" | "NEXTAUTH_SECRET" | "fallback";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_REQUESTS_PER_WINDOW = 3;
const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

export const OTP_GENERIC_REQUEST_MESSAGE =
  "If that email can receive mail, we sent a 6-digit sign-in code.";
export const OTP_GENERIC_INVALID_MESSAGE =
  "That code is invalid or expired. Request a new code and try again.";
export const OTP_COOLDOWN_MESSAGE = "Please wait a minute before requesting another code.";

export function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

/** Keep leading zeros. Never coerce the code through Number(). */
export function normalizeOtp(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.slice(-6).padStart(6, "0");
}

export function resolveOtpPepper(): { pepper: string; source: OtpPepperSource } {
  if (process.env.AUTH_SECRET) return { pepper: process.env.AUTH_SECRET, source: "AUTH_SECRET" };
  if (process.env.NEXTAUTH_SECRET) {
    return { pepper: process.env.NEXTAUTH_SECRET, source: "NEXTAUTH_SECRET" };
  }
  return { pepper: "iycm-dev-otp-secret", source: "fallback" };
}

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(code: unknown, secret: string): string {
  return createHmac("sha256", secret).update(normalizeOtp(code)).digest("hex");
}

export function otpHashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a.trim().toLowerCase());
  const right = Buffer.from(b.trim().toLowerCase());
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function otpExpiryDate(from = new Date()): Date {
  return new Date(from.getTime() + OTP_TTL_MS);
}

export function isOtpExpired(expiresAt: Date, from = new Date()): boolean {
  return expiresAt.getTime() <= from.getTime();
}

export function tooManyOtpRequests(recentCount: number): boolean {
  return recentCount >= MAX_OTP_REQUESTS_PER_WINDOW;
}

export function tooManyVerifyAttempts(attempts: number): boolean {
  return attempts >= MAX_VERIFY_ATTEMPTS;
}

export function isResendCoolingDown(lastCreatedAt: Date | null | undefined, from = new Date()): boolean {
  if (!lastCreatedAt) return false;
  return from.getTime() - lastCreatedAt.getTime() < OTP_RESEND_COOLDOWN_MS;
}

export function canShowDevOtp(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_OTP === "true";
}

export const OTP_REQUEST_WINDOW_MS_VALUE = OTP_REQUEST_WINDOW_MS;
