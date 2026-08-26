import { describe, expect, it } from "vitest";
import {
  generateOtpCode,
  hashOtp,
  isOtpExpired,
  isResendCoolingDown,
  normalizeEmail,
  normalizeOtp,
  otpExpiryDate,
  otpHashesMatch,
  tooManyOtpRequests,
  tooManyVerifyAttempts,
  canShowDevOtp,
} from "@/lib/otp";
import { defaultHomePath, isPathAllowed, navItemsForRole } from "@/lib/authorization";
import { advanceRegistrationCapacity } from "@/lib/capacity";
import { registrationConfirmationEmail } from "@/lib/registration-email";
import { formatEventLongDate } from "@/lib/dates";
import {
  COORDINATOR_EMAIL_BLOCKED,
  DUPLICATE_MEMBER_EMAIL,
  evaluateMemberCreate,
  formatPhoneDisplay,
} from "@/services/members";
import { defaultCheckInOpensAt, defaultDeadline } from "@/lib/event-schedule";
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

  it("normalizes email casing and whitespace the same way for request and verify", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
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

describe("manual member creation guards", () => {
  it("blocks active coordinator emails and duplicate member emails", () => {
    expect(evaluateMemberCreate({ existingMember: false, activeCoordinator: true, userRole: null })).toEqual({
      ok: false,
      error: COORDINATOR_EMAIL_BLOCKED,
    });
    expect(
      evaluateMemberCreate({ existingMember: false, activeCoordinator: false, userRole: "COORDINATOR" }),
    ).toEqual({ ok: false, error: COORDINATOR_EMAIL_BLOCKED });
    expect(evaluateMemberCreate({ existingMember: true, activeCoordinator: false, userRole: "MEMBER" })).toEqual({
      ok: false,
      error: DUPLICATE_MEMBER_EMAIL,
    });
    expect(evaluateMemberCreate({ existingMember: false, activeCoordinator: false, userRole: "MEMBER" })).toEqual({
      ok: true,
    });
  });
});

describe("privacy and registration labels", () => {
  it("shows full Canadian phone numbers to coordinators", () => {
    expect(formatPhoneDisplay("4165553487")).toBe("416-555-3487");
    expect(formatPhoneDisplay("647-555-2211")).toBe("647-555-2211");
    expect(formatPhoneDisplay("")).toBe("—");
  });

  it("treats walk-in reserve as part of total capacity", () => {
    expect(advanceRegistrationCapacity(50, 10)).toBe(40);
    expect(() => advanceRegistrationCapacity(10, 20)).toThrow();
  });

  it("hides capacity and uses waitlist when advance spots are full", () => {
    expect(
      memberFacingStatus({
        status: "PUBLISHED",
        registrationDeadline: new Date(Date.now() + 86_400_000),
        advanceCapacity: 40,
        advanceRegisteredCount: 40,
      }),
    ).toBe("Spots Full");
  });

  it("calculates registration deadline 48 hours before start and check-in at 8:00 AM", () => {
    const eventDate = new Date("2026-08-30T00:00:00.000Z");
    expect(defaultDeadline(eventDate, "10:00").toISOString()).toBe("2026-08-28T10:00:00.000Z");
    expect(defaultDeadline(eventDate, "09:00").toISOString()).toBe("2026-08-28T09:00:00.000Z");
    expect(defaultCheckInOpensAt(eventDate).toISOString()).toBe("2026-08-30T08:00:00.000Z");
  });

  it("builds the registration confirmation email without logging the code", () => {
    const email = registrationConfirmationEmail({
      memberName: "Maya Patel",
      eventTitle: "Mastering AI: From Everyday Tools to Real-World Impact",
      eventDate: new Date("2026-08-30T00:00:00.000Z"),
      startTime: "10:00",
      endTime: "12:00",
      location: "Hall A, The International Centre\n6900 Airport Road\nMississauga, ON L4V 1E8",
      speakerName: "Dr. Elena Brooks",
      speakerTitle: "Director, Applied AI & Innovation",
      speakerOrganization: "Microsoft Canada",
    });
    expect(email.subject).toBe("You're registered — Mastering AI: From Everyday Tools to Real-World Impact");
    expect(formatEventLongDate(new Date("2026-08-30T00:00:00.000Z"))).toBe("Sunday, August 30, 2026");
    expect(email.text).toContain("Maya Patel");
    expect(email.text).toContain("10:00 AM – 12:00 PM");
    expect(email.text).toContain("Hall A, The International Centre");
    expect(email.text).toContain("Dr. Elena Brooks");
    expect(email.text).toContain("Your registration is confirmed");
  });
});
