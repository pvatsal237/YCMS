import { describe, expect, it } from "vitest";
import { SERVE_DEPARTMENT_CODES } from "@/services/enrollment";
import { rideStatusLabel } from "@/utils/format";

describe("volunteer enrollment catalog", () => {
  it("lists serving departments without grocery as a separate serve option", () => {
    expect(SERVE_DEPARTMENT_CODES).toContain("KITCHEN");
    expect(SERVE_DEPARTMENT_CODES).toContain("TRANSPORTATION");
    expect(SERVE_DEPARTMENT_CODES).not.toContain("GROCERIES");
  });
});

describe("ride status copy", () => {
  it("uses community-facing ride statuses", () => {
    expect(rideStatusLabel("REQUESTED")).toBe("Pending Approval");
    expect(rideStatusLabel("REJECTED")).toBe("Rejected");
    expect(rideStatusLabel("ASSIGNED")).toBe("Assigned");
  });
});
