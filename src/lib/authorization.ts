import type { SessionUser } from "@/types";
import type { UserRole } from "@/types/roles";
export type { UserRole } from "@/types/roles";

export const STAFF_ROLES: UserRole[] = [
  "ADMIN",
  "COORDINATOR",
  "ATTENDANCE_VOLUNTEER",
];

export const ALL_ROLES: UserRole[] = [...STAFF_ROLES, "MEMBER"];

export function defaultHomePath(role: UserRole | string | null | undefined): string {
  if (role === "MEMBER") return "/portal";
  if (role === "ATTENDANCE_VOLUNTEER") return "/volunteer";
  if (role === "ADMIN" || role === "COORDINATOR") return "/dashboard";
  return "/";
}

export function canAccessMembers(role: UserRole): boolean {
  return role === "ADMIN" || role === "COORDINATOR";
}

export function canMutateMembers(role: UserRole): boolean {
  return role === "ADMIN" || role === "COORDINATOR";
}

export function canViewSensitiveMemberData(role: UserRole): boolean {
  return role === "ADMIN" || role === "COORDINATOR";
}

export function canCreateMeetup(role: UserRole): boolean {
  return role === "ADMIN" || role === "COORDINATOR";
}

export function canTakeAttendance(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

export function canViewImmigration(role: UserRole): boolean {
  return role === "ADMIN" || role === "COORDINATOR";
}

export function canViewFollowUps(role: UserRole): boolean {
  return role === "ADMIN" || role === "COORDINATOR";
}

export function canViewAssistance(role: UserRole): boolean {
  return role === "ADMIN" || role === "COORDINATOR";
}

export function canViewReports(role: UserRole): boolean {
  return role === "ADMIN" || role === "COORDINATOR";
}

export function canManageAdminUsers(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canAccessSystemSettings(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canViewActivityLogs(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canCreateRole(actor: UserRole, target: UserRole): boolean {
  if (actor === "ADMIN") {
    return target === "COORDINATOR" || target === "ATTENDANCE_VOLUNTEER";
  }
  if (actor === "COORDINATOR") {
    return target === "ATTENDANCE_VOLUNTEER";
  }
  return false;
}

export function canManageUser(
  actor: SessionUser,
  target: { id: string; role: UserRole; createdById?: string | null },
): boolean {
  if (actor.role === "ADMIN") {
    return target.role !== "ADMIN" || target.id === actor.id;
  }
  if (actor.role === "COORDINATOR") {
    return (
      target.role === "ATTENDANCE_VOLUNTEER" && target.createdById === actor.id
    );
  }
  return false;
}

export type NavItem = {
  href: string;
  label: string;
  roles: UserRole[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "COORDINATOR"] },
  { href: "/volunteer", label: "Home", roles: ["ATTENDANCE_VOLUNTEER"] },
  { href: "/members", label: "Members", roles: ["ADMIN", "COORDINATOR"] },
  { href: "/attendance", label: "Attendance", roles: ["ADMIN", "COORDINATOR"] },
  { href: "/volunteers", label: "Volunteers", roles: ["ADMIN", "COORDINATOR"] },
  { href: "/events", label: "Events", roles: ["ADMIN", "COORDINATOR", "ATTENDANCE_VOLUNTEER"] },
  { href: "/volunteer/departments", label: "My Departments", roles: ["ATTENDANCE_VOLUNTEER"] },
  { href: "/volunteer/assignments", label: "Assignments", roles: ["ATTENDANCE_VOLUNTEER"] },
  { href: "/volunteer/availability", label: "Availability", roles: ["ATTENDANCE_VOLUNTEER"] },
  {
    href: "/notifications",
    label: "Notifications",
    roles: ["ADMIN", "COORDINATOR", "ATTENDANCE_VOLUNTEER"],
  },
  {
    href: "/immigration",
    label: "Immigration",
    roles: ["ADMIN", "COORDINATOR"],
  },
  {
    href: "/follow-ups",
    label: "Follow-Ups",
    roles: ["ADMIN", "COORDINATOR"],
  },
  {
    href: "/assistance",
    label: "Assistance Requests",
    roles: ["ADMIN", "COORDINATOR"],
  },
  {
    href: "/transportation",
    label: "Transportation",
    roles: ["ADMIN", "COORDINATOR", "ATTENDANCE_VOLUNTEER"],
  },
  { href: "/reports", label: "Reports", roles: ["ADMIN", "COORDINATOR"] },
  { href: "/admin/users", label: "User Management", roles: ["ADMIN"] },
  { href: "/admin/logs", label: "Activity Logs", roles: ["ADMIN"] },
  { href: "/settings", label: "Settings", roles: ["ADMIN"] },
];

export function navItemsForRole(role: UserRole, options?: { departmentCodes?: string[] }): NavItem[] {
  const codes = new Set((options?.departmentCodes ?? []).map((code) => code.toUpperCase()));
  return NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (item.href === "/transportation") {
      if (role === "ADMIN" || role === "COORDINATOR") return true;
      return role === "ATTENDANCE_VOLUNTEER" && codes.has("TRANSPORTATION");
    }
    return true;
  });
}

export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/unauthorized" ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/member-login" ||
    pathname.startsWith("/api/auth")
  );
}

export function canViewVolunteerOps(role: UserRole): boolean {
  return role === "ADMIN" || role === "COORDINATOR" || role === "ATTENDANCE_VOLUNTEER";
}

export function canManageVolunteers(role: UserRole): boolean {
  return role === "ADMIN" || role === "COORDINATOR";
}

export function isPathAllowed(pathname: string, role: UserRole): boolean {
  if (isPublicPath(pathname)) return true;
  if (role === "MEMBER") {
    return pathname.startsWith("/portal");
  }
  if (pathname.startsWith("/portal")) return false;
  if (pathname === "/volunteers" || pathname.startsWith("/volunteers/")) {
    return canManageVolunteers(role);
  }
  if (pathname === "/volunteer" || pathname.startsWith("/volunteer/")) {
    return role === "ATTENDANCE_VOLUNTEER";
  }
  if (pathname.startsWith("/events")) return canViewVolunteerOps(role);
  if (pathname.startsWith("/transportation")) return canViewVolunteerOps(role);
  if (pathname.startsWith("/notifications")) {
    return role === "ADMIN" || role === "COORDINATOR" || role === "ATTENDANCE_VOLUNTEER";
  }
  if (pathname.startsWith("/immigration")) return canViewImmigration(role);
  if (pathname.startsWith("/follow-ups")) return canViewFollowUps(role);
  if (pathname.startsWith("/assistance")) return canViewAssistance(role);
  if (pathname.startsWith("/reports")) return canViewReports(role);
  if (pathname.startsWith("/admin/logs")) return canViewActivityLogs(role);
  if (pathname.startsWith("/admin/users")) {
    return role === "ADMIN";
  }
  if (pathname.startsWith("/settings")) return canAccessSystemSettings(role);
  return false;
}
