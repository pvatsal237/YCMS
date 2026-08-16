import { describe, expect, it } from "vitest";
import {
  generateOtpCode,
  hashOtp,
  otpHashesMatch,
  tooManyOtpRequests,
  tooManyVerifyAttempts,
} from "@/lib/otp";

describe("member OTP helpers", () => {
  it("generates a 6-digit code", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("hashes codes instead of comparing plain text", () => {
    const secret = "test-secret";
    const hash = hashOtp("123456", secret);
    expect(hash).not.toBe("123456");
    expect(otpHashesMatch(hash, hashOtp("123456", secret))).toBe(true);
    expect(otpHashesMatch(hash, hashOtp("000000", secret))).toBe(false);
  });

  it("rate-limits requests and verify attempts", () => {
    expect(tooManyOtpRequests(2)).toBe(false);
    expect(tooManyOtpRequests(3)).toBe(true);
    expect(tooManyVerifyAttempts(4)).toBe(false);
    expect(tooManyVerifyAttempts(5)).toBe(true);
  });
});
