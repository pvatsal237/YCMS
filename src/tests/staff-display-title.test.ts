import { describe, expect, it } from "vitest";
import { staffDisplayTitle } from "@/utils/format";

describe("staffDisplayTitle", () => {
  it("shows kitchen lead instead of volunteer when the person leads a department", () => {
    expect(staffDisplayTitle("ATTENDANCE_VOLUNTEER", ["KITCHEN"])).toBe("Kitchen Lead");
    expect(staffDisplayTitle("ATTENDANCE_VOLUNTEER", [])).toBe("Volunteer");
    expect(staffDisplayTitle("COORDINATOR", ["KITCHEN"])).toBe("Youth Coordinator");
  });
});
