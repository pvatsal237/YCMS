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
import { COORDINATOR_DASHBOARD_STATS, defaultHomePath, isPathAllowed, navItemsForRole } from "@/lib/authorization";
import { eventTitleParts } from "@/utils/format";
import { advanceRegistrationCapacity } from "@/lib/capacity";
import { registrationConfirmationEmail } from "@/lib/registration-email";
import { formatEventLongDate, parseEventDate, parseTimeOfDay, formatCheckInOpensMessage, isCheckInOpen } from "@/lib/dates";
import { AppError, toUserMessage } from "@/lib/errors";
import {
  COORDINATOR_EMAIL_BLOCKED,
  DUPLICATE_MEMBER_EMAIL,
  evaluateMemberCreate,
  formatPhoneDisplay,
} from "@/services/members";
import { defaultCheckInOpensAt, defaultDeadline } from "@/lib/event-schedule";
import { sanitizeEventText, inspectEventTextFields } from "@/lib/sanitize-text";
import { buildEventWriteData, featuredPublishedEvent, memberFacingStatus } from "@/services/events";
import {
  alreadyClaimedMessage,
  canCoordinatorReleaseGuidance,
  canMemberCancelGuidance,
  guidanceQueueSections,
  isUnclaimedGuidance,
} from "@/lib/guidance-rules";
import { guidanceAssignmentLabel } from "@/services/guidance";
import {
  inspectEventWriteStrings,
  newEventId,
  newWalkInToken,
  prepareEventWritePayload,
} from "@/lib/event-write-payload";

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
    expect(isPathAllowed("/events/new", "COORDINATOR")).toBe(true);
    expect(isPathAllowed("/events", "MEMBER")).toBe(false);
    expect(isPathAllowed("/home", "MEMBER")).toBe(true);
    expect(isPathAllowed("/dashboard", "MEMBER")).toBe(false);
    expect(navItemsForRole("COORDINATOR").map((item) => item.label)).toEqual([
      "Dashboard",
      "Events",
      "Members",
      "Guidance",
      "Reports",
    ]);
    expect(navItemsForRole("MEMBER").map((item) => item.label)).toEqual([
      "Home",
      "My Events",
      "Request Guidance",
      "Profile",
    ]);
  });
});

describe("coordinator list helpers", () => {
  it("features the nearest upcoming published event", () => {
    const today = new Date("2026-08-26T00:00:00.000Z");
    const featured = featuredPublishedEvent(
      [
        { status: "DRAFT", eventDate: new Date("2026-08-30T00:00:00.000Z"), startTime: "09:00" },
        { status: "PUBLISHED", eventDate: new Date("2026-09-12T00:00:00.000Z"), startTime: "10:00" },
        { status: "PUBLISHED", eventDate: new Date("2026-08-30T00:00:00.000Z"), startTime: "10:00" },
        { status: "PUBLISHED", eventDate: new Date("2026-08-20T00:00:00.000Z"), startTime: "10:00" },
      ],
      today,
    );
    expect(featured?.eventDate.toISOString()).toBe("2026-08-30T00:00:00.000Z");
    expect(eventTitleParts("Mastering AI: From Everyday Tools to Real-World Impact")).toEqual({
      heading: "Mastering AI",
      subtitle: "From Everyday Tools to Real-World Impact",
    });
  });

  it("labels guidance assignment for unclaimed, self, and other coordinators", () => {
    expect(guidanceAssignmentLabel({ claimedById: null }, "me")).toBe("Unclaimed");
    expect(guidanceAssignmentLabel({ claimedById: "me", claimedBy: { name: "Priya" } }, "me")).toBe("Assigned to you");
    expect(guidanceAssignmentLabel({ claimedById: "them", claimedBy: { name: "James Okonkwo" } }, "me")).toBe(
      "Assigned to James Okonkwo",
    );
    expect(canMemberCancelGuidance({ memberId: "m1", status: "NEW", claimedById: null }, "m1")).toBe(true);
    expect(canMemberCancelGuidance({ memberId: "m1", status: "CLAIMED", claimedById: "c1" }, "m1")).toBe(false);
    expect(canMemberCancelGuidance({ memberId: "m1", status: "NEW", claimedById: null }, "other")).toBe(false);
  });

  it("lets only the assigned coordinator release a claimed request", () => {
    expect(canCoordinatorReleaseGuidance({ claimedById: "me", status: "CLAIMED" }, "me")).toBe(true);
    expect(canCoordinatorReleaseGuidance({ claimedById: "me", status: "WAITING_FOR_MEMBER" }, "me")).toBe(true);
    expect(canCoordinatorReleaseGuidance({ claimedById: "them", status: "CLAIMED" }, "me")).toBe(false);
    expect(canCoordinatorReleaseGuidance({ claimedById: "me", status: "RESOLVED" }, "me")).toBe(false);
    expect(canCoordinatorReleaseGuidance({ claimedById: null, status: "NEW" }, "me")).toBe(false);
    expect(alreadyClaimedMessage("James Okonkwo")).toBe(
      "This request has already been claimed by James Okonkwo.",
    );
    expect(isUnclaimedGuidance({ status: "NEW", claimedById: null })).toBe(true);
    expect(isUnclaimedGuidance({ status: "CLAIMED", claimedById: "me" })).toBe(false);
  });

  it("hides the unclaimed empty state when the coordinator already has assigned requests", () => {
    expect(
      guidanceQueueSections({ assignedToMeCount: 1, unclaimedCount: 0, assignedToOthersCount: 0 }),
    ).toEqual({
      showAssignedToMe: true,
      showUnclaimed: false,
      showAssignedToOthers: false,
      showEmptyState: false,
    });
    expect(
      guidanceQueueSections({ assignedToMeCount: 0, unclaimedCount: 0, assignedToOthersCount: 0 }),
    ).toEqual({
      showAssignedToMe: false,
      showUnclaimed: false,
      showAssignedToOthers: false,
      showEmptyState: true,
    });
    expect(
      guidanceQueueSections({ assignedToMeCount: 2, unclaimedCount: 1, assignedToOthersCount: 0 }),
    ).toEqual({
      showAssignedToMe: true,
      showUnclaimed: true,
      showAssignedToOthers: false,
      showEmptyState: false,
    });
  });

  it("maps dashboard summary cards to coordinator routes", () => {
    expect(COORDINATOR_DASHBOARD_STATS.map((item) => [item.label, item.href])).toEqual([
      ["Published Events", "/events"],
      ["Active Members", "/members"],
      ["Unclaimed Guidance", "/guidance"],
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
    expect(formatPhoneDisplay("")).toBe("Not provided");
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
    expect(formatCheckInOpensMessage(defaultCheckInOpensAt(eventDate))).toBe(
      "Check-in opens Sunday, August 30, 2026 at 8:00 AM.",
    );
    expect(isCheckInOpen(defaultCheckInOpensAt(eventDate), new Date("2026-08-30T07:59:00.000Z"))).toBe(false);
    expect(isCheckInOpen(defaultCheckInOpensAt(eventDate), new Date("2026-08-30T08:00:00.000Z"))).toBe(true);
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

describe("event text sanitization", () => {
  const base = {
    title: "Mastering AI",
    description: "Learn practical AI skills.\nAsk questions.",
    speakerName: "Dr. Elena Brooks",
    speakerTitle: "Director, Applied AI & Innovation",
    speakerOrganization: "Microsoft Canada",
    eventDate: "2026-08-30",
    startTime: "10:00",
    endTime: "12:00",
    location: "Hall A, The International Centre",
    capacity: 50,
    walkInCapacity: 10,
    internalNotes: "Demo only",
  };

  it("keeps normal event text unchanged", () => {
    expect(sanitizeEventText("  Hello, world!  ")).toBe("Hello, world!");
    const data = buildEventWriteData(base);
    expect(data.title).toBe("Mastering AI");
    expect(data.description).toBe("Learn practical AI skills.\nAsk questions.");
    expect(data.speakerName).toBe("Dr. Elena Brooks");
    expect(data.location).toBe("Hall A, The International Centre");
  });

  it("removes unsafe ASCII control characters and keeps Unicode and line breaks", () => {
    expect(sanitizeEventText("Hello\u0000World")).toBe("HelloWorld");
    expect(sanitizeEventText("A\u0001B\u001FC")).toBe("ABC");
    expect(sanitizeEventText("Keep\tthis\nline\rand DEL\u007Fout")).toBe("Keep\tthis\nline\rand DELout");
    expect(sanitizeEventText("café – résumé 🎉 O'Neil")).toBe("café – résumé 🎉 O'Neil");
    expect(sanitizeEventText("café – résumé\nline")).toBe("café – résumé\nline");
    const dirty = {
      ...base,
      title: "AI\u0000 Session",
      description: "Use AI\u0001 responsibly\nwith care",
      speakerName: "Renée\u001F Dupont",
      speakerTitle: "Lead\u007F",
      speakerOrganization: "École\u0000 Polytechnique",
      location: "Montréal\tHall A",
      internalNotes: "note\u0000",
    };
    expect(inspectEventTextFields(dirty).find((field) => field.field === "title")?.hadNull).toBe(true);
    const created = buildEventWriteData(dirty);
    const updated = buildEventWriteData({ ...dirty, title: "Updated\u0000 title" });
    expect(created.title).toBe("AI Session");
    expect(created.description).toBe("Use AI responsibly\nwith care");
    expect(created.speakerName).toBe("Renée Dupont");
    expect(created.speakerTitle).toBe("Lead");
    expect(created.speakerOrganization).toBe("École Polytechnique");
    expect(created.location).toBe("Montréal\tHall A");
    expect(created.internalNotes).toBe("note");
    expect(updated.title).toBe("Updated title");
    expect(created.title.includes("\u0000")).toBe(false);
    expect(created.description.includes("\u0001")).toBe(false);
    expect(updated.title.includes("\u0000")).toBe(false);
  });

  it("rejects missing dates and normalizes times", () => {
    expect(() => parseEventDate("")).toThrow(AppError);
    expect(() => parseEventDate("2026-13-40")).toThrow(AppError);
    expect(parseEventDate("2026-08-30").toISOString()).toBe("2026-08-30T00:00:00.000Z");
    expect(parseTimeOfDay("10:00:00", "start time")).toBe("10:00");
    expect(() => buildEventWriteData({ ...base, eventDate: "" })).toThrow(/valid event date/i);
    expect(() => buildEventWriteData({ ...base, startTime: "12:00", endTime: "10:00" })).toThrow(/after start time/i);
    expect(() => buildEventWriteData({ ...base, capacity: Number.NaN })).toThrow(/valid capacity/i);
    expect(toUserMessage(new Error("invalid byte sequence for encoding \"UTF8\": 0x00"), "Unable to save event.")).toMatch(/cannot be stored/i);
  });

  it("keeps every string in the Prisma event write payload free of null bytes", () => {
    const binaryToken = Buffer.from([0x77, 0x00, 0x6b]).toString("utf8");
    expect(binaryToken.includes("\u0000")).toBe(true);
    expect(inspectEventWriteStrings({ walkInToken: binaryToken }).find((field) => field.field === "walkInToken")?.hasNull).toBe(true);
    expect(newWalkInToken().includes("\u0000")).toBe(false);
    expect(newEventId().includes("\u0000")).toBe(false);

    const { payload, fields } = prepareEventWritePayload(
      buildEventWriteData(base, "cluser\u0000id123"),
      { assignId: true },
    );
    expect(fields.some((field) => field.field === "id")).toBe(true);
    expect(payload.createdById).toBe("cluserid123");
    for (const value of Object.values(payload)) {
      if (typeof value === "string") {
        expect(value.includes("\u0000")).toBe(false);
      }
    }
  });
});
