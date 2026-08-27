import { timingSafeEqual } from "node:crypto";
import { DEMO_BYPASS_INVALID_MESSAGE, isDemoBypassEmail } from "@/lib/demo-bypass-accounts";
import { normalizeEmail } from "@/lib/otp";

export { DEMO_BYPASS_EMAILS, DEMO_BYPASS_INVALID_MESSAGE, isDemoBypassEmail } from "@/lib/demo-bypass-accounts";

function timingSafeStringEqual(left: string, right: string) {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  const length = Math.max(leftBuf.length, rightBuf.length, 1);
  const leftPad = Buffer.alloc(length);
  const rightPad = Buffer.alloc(length);
  leftBuf.copy(leftPad);
  rightBuf.copy(rightPad);
  const sameContents = timingSafeEqual(leftPad, rightPad);
  return leftBuf.length === rightBuf.length && sameContents;
}

export function demoBypassPasswordMatches(password: string) {
  const expected = process.env.DEMO_BYPASS_PASSWORD ?? "";
  if (!expected || !password) return false;
  return timingSafeStringEqual(password, expected);
}

export function canUseDemoBypass(emailRaw: string, passwordRaw: string) {
  const email = normalizeEmail(emailRaw);
  const password = String(passwordRaw ?? "");
  return isDemoBypassEmail(email) && demoBypassPasswordMatches(password);
}

export function demoBypassRejection() {
  return { ok: false as const, error: DEMO_BYPASS_INVALID_MESSAGE };
}
