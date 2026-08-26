import { describe, expect, it } from "vitest";
import {
  generateOtpCode,
  hashOtp,
  isOtpExpired,
  isResendCoolingDown,
  normalizeOtp,
  otpExpiryDate,
  otpHashesMatch,
  tooManyOtpRequests,
  tooManyVerifyAttempts,
  canShowDevOtp,
} from "@/lib/otp";
import { defaultHomePath, isPathAllowed, navItemsForRole } from "@/lib/authorization";
import { maskPhone } from "@/services/members";
import { memberFacingStatus } from "@/services/events";

describe("OTP helpers", () => {
  it("generates a 6-digit code and hashes it", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
    const hash = hashOtp(code, "secret");
    expect(hash).not.toBe(code);
    expect(otpHashesMatch(hash, hashOtp(code, "secret"))).toBe(true);
    expect(tooManyOtpRequests(3)).toBe(true);
    expect(tooManyVerifyAttempts(5)).toBe(true);
    expect(isResendCoolingDown(new Date())).toBe(true);
    expect(canShowDevOtp()).toBe(process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_OTP === "true");
  });

  it("preserves leading zeros and hashes the same after number-like input", () => {
    expect(normalizeOtp("012345")).toBe("012345");
    expect(normalizeOtp(12345)).toBe("012345");
    expect(hashOtp("012345", "secret")).toBe(hashOtp(12345, "secret"));
    expect(otpHashesMatch(hashOtp("012345", "secret"), hashOtp("012345", "secret"))).toBe(true);
  });

  it("compares expiry in UTC milliseconds", () => {
    const from = new Date("2026-08-26T18:00:00.000Z");
    const expiresAt = otpExpiryDate(from);
    expect(expiresAt.toISOString()).toBe("2026-08-26T18:10:00.000Z");
    expect(isOtpExpired(expiresAt, from)).toBe(false);
    expect(isOtpExpired(expiresAt, new Date("2026-08-26T18:10:00.000Z"))).toBe(true);
  });
});

describe("roles and navigation", () => {
  it("keeps coordinators and members on their own portals", () => {
    expect(defaultHomePath("COORDINATOR")).toBe("/dashboard");
    expect(defaultHomePath("MEMBER")).toBe("/home");
    expect(isPathAllowed("/events", "COORDINATOR")).toBe(true);
    expect(isPathAllowed("/events", "MEMBER")).toBe(false);
    expect(isPathAllowed("/home", "MEMBER")).toBe(true);
    expect(isPathAllowed("/dashboard", "MEMBER")).toBe(false);
    expect(navItemsForRole("COORDINATOR").map((item) => item.label)).toEqual([
      "Dashboard",
      "Events",
      "Members",
      "Guidance",
      "Reports",
      "Notifications",
    ]);
    expect(navItemsForRole("MEMBER").map((item) => item.label)).toEqual([
      "Home",
      "My Events",
      "Request Guidance",
      "Profile",
      "Notifications",
    ]);
  });
});

describe("privacy and registration labels", () => {
  it("masks phone numbers", () => {
    expect(maskPhone("4165553487")).toBe("******3487");
  });

  it("hides capacity and uses waitlist when full", () => {
    expect(
      memberFacingStatus({
        status: "PUBLISHED",
        registrationDeadline: new Date(Date.now() + 86_400_000),
        capacity: 10,
        registeredCount: 10,
      }),
    ).toBe("Spots Full");
  });
});
