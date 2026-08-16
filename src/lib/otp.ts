import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_REQUESTS_PER_WINDOW = 3;
const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

export const OTP_GENERIC_REQUEST_MESSAGE =
  "If that email is registered and active, we sent a sign-in code.";
export const OTP_GENERIC_INVALID_MESSAGE =
  "That code is invalid or expired. Request a new code and try again.";

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(code: string, secret: string): string {
  return createHmac("sha256", secret).update(code.trim()).digest("hex");
}

export function otpHashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
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

export const OTP_REQUEST_WINDOW_MS_VALUE = OTP_REQUEST_WINDOW_MS;
