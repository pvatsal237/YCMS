import type { SessionUser } from "@/types";
import type { UserRole } from "@/types/roles";
export type { UserRole } from "@/types/roles";

export const STAFF_ROLES: UserRole[] = [
  "ADMIN",
  "COORDINATOR",
  "ATTENDANCE_VOLUNTEER",
];

export const ALL_ROLES: UserRole[] = [...STAFF_ROLES, "MEMBER"];

export function defaultHomePath(role: UserRole): string {
  return role === "MEMBER" ? "/portal" : "/dashboard";
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
  { href: "/dashboard", label: "Dashboard", roles: STAFF_ROLES },
  { href: "/members", label: "Members", roles: ["ADMIN", "COORDINATOR"] },
  { href: "/attendance", label: "Attendance", roles: STAFF_ROLES },
  {
    href: "/notifications",
    label: "Notifications",
    roles: ["ADMIN", "COORDINATOR"],
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
  { href: "/reports", label: "Reports", roles: ["ADMIN", "COORDINATOR"] },
  { href: "/admin/users", label: "User Management", roles: ["ADMIN", "COORDINATOR"] },
  { href: "/admin/logs", label: "Activity Logs", roles: ["ADMIN"] },
  { href: "/settings", label: "Settings", roles: ["ADMIN"] },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
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

export function isPathAllowed(pathname: string, role: UserRole): boolean {
  if (isPublicPath(pathname)) return true;
  if (role === "MEMBER") {
    return pathname.startsWith("/portal");
  }
  if (pathname.startsWith("/portal")) return false;
  if (pathname.startsWith("/dashboard")) return STAFF_ROLES.includes(role);
  if (pathname.startsWith("/attendance/new")) return canCreateMeetup(role);
  if (pathname.startsWith("/attendance")) return canTakeAttendance(role);
  if (pathname.startsWith("/members")) return canAccessMembers(role);
  if (pathname.startsWith("/notifications")) return canViewImmigration(role);
  if (pathname.startsWith("/immigration")) return canViewImmigration(role);
  if (pathname.startsWith("/follow-ups")) return canViewFollowUps(role);
  if (pathname.startsWith("/reports")) return canViewReports(role);
  if (pathname.startsWith("/admin/logs")) return canViewActivityLogs(role);
  if (pathname.startsWith("/admin/users")) {
    return role === "ADMIN" || role === "COORDINATOR";
  }
  if (pathname.startsWith("/settings")) return canAccessSystemSettings(role);
  return false;
}
