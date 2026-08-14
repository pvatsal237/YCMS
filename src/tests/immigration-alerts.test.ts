import { describe, expect, it } from "vitest";
import {
  getImmigrationAlertLevel,
  getAlertPresentation,
  alertSortRank,
} from "@/utils/immigration-alerts";

function utc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

describe("immigration expiry alert calculation", () => {
  const from = utc(2026, 8, 14);

  it("marks more than 365 days as valid", () => {
    expect(getImmigrationAlertLevel(utc(2028, 1, 1), from)).toBe("VALID");
  });

  it("marks 181-365 days as expiring within 12 months", () => {
    expect(getImmigrationAlertLevel(utc(2027, 8, 14), from)).toBe("EXPIRING_12_MONTHS");
    expect(getImmigrationAlertLevel(utc(2027, 2, 12), from)).toBe("EXPIRING_12_MONTHS");
  });

  it("marks 91-180 days as expiring within 6 months", () => {
    expect(getImmigrationAlertLevel(utc(2027, 2, 10), from)).toBe("EXPIRING_6_MONTHS");
    expect(getImmigrationAlertLevel(utc(2026, 11, 13), from)).toBe("EXPIRING_6_MONTHS");
  });

  it("marks 0-90 days as expiring within 3 months", () => {
    expect(getImmigrationAlertLevel(utc(2026, 8, 14), from)).toBe("EXPIRING_3_MONTHS");
    expect(getImmigrationAlertLevel(utc(2026, 11, 12), from)).toBe("EXPIRING_3_MONTHS");
  });

  it("marks past expiry as expired", () => {
    expect(getImmigrationAlertLevel(utc(2026, 8, 13), from)).toBe("EXPIRED");
  });

  it("does not persist colors; presentation is derived", () => {
    const alert = getAlertPresentation(utc(2026, 9, 1), from);
    expect(alert.tone).toBe("red");
    expect(alert.daysRemaining).toBe(18);
  });

  it("sorts urgent items first", () => {
    expect(alertSortRank("EXPIRED")).toBeLessThan(alertSortRank("EXPIRING_3_MONTHS"));
    expect(alertSortRank("EXPIRING_3_MONTHS")).toBeLessThan(alertSortRank("VALID"));
  });
});
