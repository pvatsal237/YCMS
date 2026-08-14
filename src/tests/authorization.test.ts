import { describe, expect, it } from "vitest";
import {
  canAccessMembers,
  canAccessSystemSettings,
  canCreateMeetup,
  canCreateRole,
  canManageAdminUsers,
  canManageUser,
  canTakeAttendance,
  canViewImmigration,
  canViewSensitiveMemberData,
  isPathAllowed,
} from "@/lib/authorization";

describe("role authorization", () => {
  it("allows admins to manage coordinators and system settings", () => {
    expect(canManageAdminUsers("ADMIN")).toBe(true);
    expect(canCreateRole("ADMIN", "COORDINATOR")).toBe(true);
    expect(canAccessSystemSettings("ADMIN")).toBe(true);
    expect(isPathAllowed("/admin/logs", "ADMIN")).toBe(true);
    expect(isPathAllowed("/settings", "ADMIN")).toBe(true);
  });

  it("prevents coordinators from administrator-only functions", () => {
    expect(canCreateRole("COORDINATOR", "COORDINATOR")).toBe(false);
    expect(canCreateRole("COORDINATOR", "ATTENDANCE_VOLUNTEER")).toBe(true);
    expect(canAccessSystemSettings("COORDINATOR")).toBe(false);
    expect(isPathAllowed("/admin/logs", "COORDINATOR")).toBe(false);
    expect(isPathAllowed("/settings", "COORDINATOR")).toBe(false);
    expect(isPathAllowed("/admin/users", "COORDINATOR")).toBe(true);
    expect(isPathAllowed("/members", "COORDINATOR")).toBe(true);
  });

  it("restricts attendance volunteers from sensitive data and admin pages", () => {
    expect(canViewSensitiveMemberData("ATTENDANCE_VOLUNTEER")).toBe(false);
    expect(canViewImmigration("ATTENDANCE_VOLUNTEER")).toBe(false);
    expect(canAccessMembers("ATTENDANCE_VOLUNTEER")).toBe(false);
    expect(canTakeAttendance("ATTENDANCE_VOLUNTEER")).toBe(true);
    expect(canCreateMeetup("ATTENDANCE_VOLUNTEER")).toBe(false);
    expect(isPathAllowed("/immigration", "ATTENDANCE_VOLUNTEER")).toBe(false);
    expect(isPathAllowed("/members", "ATTENDANCE_VOLUNTEER")).toBe(false);
    expect(isPathAllowed("/attendance", "ATTENDANCE_VOLUNTEER")).toBe(true);
    expect(isPathAllowed("/attendance/new", "ATTENDANCE_VOLUNTEER")).toBe(false);
    expect(isPathAllowed("/admin/users", "ATTENDANCE_VOLUNTEER")).toBe(false);
  });

  it("only lets coordinators manage volunteers they created", () => {
    const coordinator = {
      id: "c1",
      name: "Coord",
      email: "c@x",
      role: "COORDINATOR" as const,
      active: true,
    };
    expect(
      canManageUser(coordinator, {
        id: "v1",
        role: "ATTENDANCE_VOLUNTEER",
        createdById: "c1",
      }),
    ).toBe(true);
    expect(
      canManageUser(coordinator, {
        id: "v2",
        role: "ATTENDANCE_VOLUNTEER",
        createdById: "other",
      }),
    ).toBe(false);
    expect(
      canManageUser(coordinator, { id: "a1", role: "ADMIN", createdById: null }),
    ).toBe(false);
  });
});
