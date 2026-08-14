import { describe, expect, it } from "vitest";
import {
  countConsecutiveAbsences,
  shouldOpenThreeAbsenceFollowUp,
  hasDuplicateAttendancePairs,
} from "@/utils/consecutive-absences";

const meetups = [{ id: "m1" }, { id: "m2" }, { id: "m3" }, { id: "m4" }, { id: "m5" }, { id: "m6" }];

describe("three consecutive absence detection", () => {
  it("flags three consecutive absences from the latest meetups", () => {
    const count = countConsecutiveAbsences(meetups, {
      m1: { meetupId: "m1", status: "ABSENT" },
      m2: { meetupId: "m2", status: "ABSENT" },
      m3: { meetupId: "m3", status: "ABSENT" },
      m4: { meetupId: "m4", status: "PRESENT" },
    });
    expect(count).toBe(3);
    expect(shouldOpenThreeAbsenceFollowUp(count, false)).toBe(true);
  });

  it("does not count EXCUSED as an absence and skips it", () => {
    const count = countConsecutiveAbsences(meetups, {
      m1: { meetupId: "m1", status: "ABSENT" },
      m2: { meetupId: "m2", status: "EXCUSED" },
      m3: { meetupId: "m3", status: "ABSENT" },
      m4: { meetupId: "m4", status: "ABSENT" },
    });
    expect(count).toBe(3);
  });

  it("breaks the streak on PRESENT", () => {
    const count = countConsecutiveAbsences(meetups, {
      m1: { meetupId: "m1", status: "ABSENT" },
      m2: { meetupId: "m2", status: "PRESENT" },
      m3: { meetupId: "m3", status: "ABSENT" },
      m4: { meetupId: "m4", status: "ABSENT" },
    });
    expect(count).toBe(1);
    expect(shouldOpenThreeAbsenceFollowUp(count, false)).toBe(false);
  });

  it("stops when a meetup has no attendance record", () => {
    const count = countConsecutiveAbsences(meetups, {
      m1: { meetupId: "m1", status: "ABSENT" },
      m3: { meetupId: "m3", status: "ABSENT" },
    });
    expect(count).toBe(1);
  });
});

describe("duplicate follow-up prevention", () => {
  it("does not open a second follow-up when one is already open", () => {
    expect(shouldOpenThreeAbsenceFollowUp(3, true)).toBe(false);
    expect(shouldOpenThreeAbsenceFollowUp(4, false)).toBe(true);
  });
});

describe("duplicate attendance prevention", () => {
  it("detects duplicate member/meetup pairs before save", () => {
    expect(
      hasDuplicateAttendancePairs([
        { meetupId: "m1", memberId: "a" },
        { meetupId: "m1", memberId: "b" },
      ]),
    ).toBe(false);
    expect(
      hasDuplicateAttendancePairs([
        { meetupId: "m1", memberId: "a" },
        { meetupId: "m1", memberId: "a" },
      ]),
    ).toBe(true);
  });
});
