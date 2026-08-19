import { describe, expect, it } from "vitest";
import {
  SCHEDULE_CONFLICT_MESSAGE,
  assignmentFitsAvailability,
  rangesOverlap,
  windowsOverlap,
} from "@/utils/volunteer-schedule";

describe("volunteer schedule rules", () => {
  it("allows groceries earlier and seating later on the same day", () => {
    expect(
      windowsOverlap(
        { dateKey: "2026-08-21", startTime: "18:00", endTime: "20:00" },
        { dateKey: "2026-08-21", startTime: "20:00", endTime: "22:00" },
      ),
    ).toBe(false);
  });

  it("blocks food preparation overlapping seating setup", () => {
    expect(rangesOverlap("15:00", "19:00", "15:00", "17:00")).toBe(true);
  });

  it("requires a partial window to cover the full task", () => {
    expect(assignmentFitsAvailability("15:00", "19:00", "15:00", "17:00")).toBe(false);
    expect(assignmentFitsAvailability("15:00", "17:00", "15:00", "19:00")).toBe(true);
  });

  it("keeps the conflict copy stable", () => {
    expect(SCHEDULE_CONFLICT_MESSAGE).toBe("You are already assigned to another activity during this time.");
  });
});
