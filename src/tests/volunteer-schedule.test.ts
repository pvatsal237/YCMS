import { describe, expect, it } from "vitest";
import {
  SCHEDULE_CONFLICT_MESSAGE,
  assignmentFitsAvailability,
  kitchenLeadMembershipConflict,
  rangesOverlap,
  shiftIsoDate,
  staffingShortage,
  windowsOverlap,
  isLeadForDepartment,
} from "@/utils/volunteer-schedule";

describe("volunteer schedule rules", () => {
  it("calculates shortage from needed minus confirmed", () => {
    expect(staffingShortage(10, 6)).toBe(4);
    expect(staffingShortage(10, 10)).toBe(0);
    expect(staffingShortage(4, 6)).toBe(0);
  });

  it("allows groceries on an earlier date and chopping on event day", () => {
    expect(
      windowsOverlap(
        { dateKey: shiftIsoDate("2026-09-12", -2), startTime: "18:00", endTime: "20:00" },
        { dateKey: "2026-09-12", startTime: "14:00", endTime: "16:00" },
      ),
    ).toBe(false);
  });

  it("allows chopping then food preparation when times do not overlap", () => {
    expect(rangesOverlap("15:00", "17:00", "17:00", "19:00")).toBe(false);
  });

  it("blocks overlapping chopping and seating setup", () => {
    expect(rangesOverlap("15:00", "17:00", "16:00", "18:00")).toBe(true);
  });

  it("requires a partial window to cover the full task", () => {
    expect(assignmentFitsAvailability("15:00", "19:00", "15:00", "17:00")).toBe(false);
    expect(assignmentFitsAvailability("15:00", "17:00", "15:00", "19:00")).toBe(true);
  });

  it("keeps the conflict copy stable", () => {
    expect(SCHEDULE_CONFLICT_MESSAGE).toBe("You are already assigned to another activity during this time.");
  });

  it("does not let a kitchen lead also join seating and setup", () => {
    expect(kitchenLeadMembershipConflict(["KITCHEN"], ["KITCHEN", "SEATING_SETUP"])).toBe(
      "Kitchen leads stay with food preparation through the end of the event, so they cannot volunteer for Seating & Setup.",
    );
    expect(kitchenLeadMembershipConflict(["KITCHEN"], ["KITCHEN"])).toBeNull();
  });

  it("treats lead designation as per-department, not global", () => {
    expect(
      isLeadForDepartment(
        [
          { departmentId: "kitchen", responsibility: "LEAD" },
          { departmentId: "recreation", responsibility: "VOLUNTEER" },
        ],
        "kitchen",
      ),
    ).toBe(true);
    expect(
      isLeadForDepartment(
        [
          { departmentId: "kitchen", responsibility: "LEAD" },
          { departmentId: "recreation", responsibility: "VOLUNTEER" },
        ],
        "recreation",
      ),
    ).toBe(false);
  });
});
