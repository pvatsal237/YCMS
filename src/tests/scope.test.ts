import { describe, expect, it } from "vitest";
import { maskEmail, maskPhone, splitDisplayName } from "@/lib/privacy";
import { defaultDeadline, nextSundayDate } from "@/services/events";
import { isPathAllowed, defaultHomePath } from "@/lib/authorization";

describe("privacy", () => {
  it("masks phone to last 4 digits", () => {
    expect(maskPhone("4165553487")).toBe("******3487");
    expect(maskPhone(null)).toBe("—");
  });

  it("splits google display names", () => {
    expect(splitDisplayName("Hetvi Patel", "h@x.com")).toEqual({ firstName: "Hetvi", lastName: "Patel" });
  });

  it("masks emails", () => {
    expect(maskEmail("hetvi.patel@gmail.com")).toBe("h***@gmail.com");
    expect(maskEmail(null)).toBe("(none)");
  });
});

describe("event defaults", () => {
  it("picks a sunday and a 48h deadline", () => {
    const sunday = nextSundayDate(new Date("2026-09-01T12:00:00"));
    expect(sunday.getDay()).toBe(0);
    const deadline = defaultDeadline(new Date("2026-09-06T00:00:00"), "09:00");
    expect(deadline.getTime()).toBeLessThan(new Date("2026-09-06T09:00:00").getTime());
  });
});

describe("authorization", () => {
  it("sends members to portal and coordinators to dashboard", () => {
    expect(defaultHomePath("MEMBER")).toBe("/portal");
    expect(defaultHomePath("COORDINATOR")).toBe("/dashboard");
  });

  it("blocks members from coordinator routes", () => {
    expect(isPathAllowed("/dashboard", "MEMBER")).toBe(false);
    expect(isPathAllowed("/portal", "MEMBER")).toBe(true);
    expect(isPathAllowed("/events", "COORDINATOR")).toBe(true);
    expect(isPathAllowed("/volunteer", "COORDINATOR")).toBe(false);
  });
});
