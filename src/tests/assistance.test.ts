import { describe, expect, it } from "vitest";
import { assistanceListWhere, isEligibleImmigrationDocument } from "@/services/assistance";
import { addUtcDays, startOfUtcDay } from "@/lib/dates";

describe("assistance requests", () => {
  it("allows immigration requests only within 12 months or expired", () => {
    const today = startOfUtcDay();
    expect(isEligibleImmigrationDocument(addUtcDays(today, -1))).toBe(true);
    expect(isEligibleImmigrationDocument(addUtcDays(today, 30))).toBe(true);
    expect(isEligibleImmigrationDocument(addUtcDays(today, 365))).toBe(true);
    expect(isEligibleImmigrationDocument(addUtcDays(today, 366))).toBe(false);
  });

  it("lets coordinators see coordinator-role or personally assigned requests only", () => {
    const coordinator = {
      id: "c1",
      name: "Coord",
      email: "c@x",
      role: "COORDINATOR" as const,
      active: true,
    };
    expect(assistanceListWhere(coordinator)).toEqual({
      OR: [
        { requestedRole: "COORDINATOR" },
        { requestedUserId: "c1" },
        { assignedToId: "c1" },
      ],
    });
    expect(assistanceListWhere({ ...coordinator, role: "ADMIN", id: "a1" })).toEqual({});
  });
});
