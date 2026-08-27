import type { UserRole } from "@/types/roles";

export type NavItem = {
  href: string;
  label: string;
  roles: UserRole[];
};

export const COORDINATOR_PATHS = {
  dashboard: "/dashboard",
  events: "/events",
  members: "/members",
  guidance: "/guidance",
  reports: "/reports",
} as const;

export const COORDINATOR_DASHBOARD_STATS = [
  { key: "published" as const, label: "Published Events", href: COORDINATOR_PATHS.events },
  { key: "members" as const, label: "Active Members", href: COORDINATOR_PATHS.members },
  { key: "openGuidance" as const, label: "Unclaimed Guidance", href: COORDINATOR_PATHS.guidance },
];

export function defaultHomePath(role: UserRole | string | null | undefined): string {
  if (role === "COORDINATOR") return COORDINATOR_PATHS.dashboard;
  if (role === "MEMBER") return "/home";
  return "/login";
}

export const NAV_ITEMS: NavItem[] = [
  { href: COORDINATOR_PATHS.dashboard, label: "Dashboard", roles: ["COORDINATOR"] },
  { href: COORDINATOR_PATHS.events, label: "Events", roles: ["COORDINATOR"] },
  { href: COORDINATOR_PATHS.members, label: "Members", roles: ["COORDINATOR"] },
  { href: COORDINATOR_PATHS.guidance, label: "Guidance", roles: ["COORDINATOR"] },
  { href: COORDINATOR_PATHS.reports, label: "Reports", roles: ["COORDINATOR"] },
  { href: "/home", label: "Home", roles: ["MEMBER"] },
  { href: "/my-events", label: "My Events", roles: ["MEMBER"] },
  { href: "/request-guidance", label: "Request Guidance", roles: ["MEMBER"] },
  { href: "/profile", label: "Profile", roles: ["MEMBER"] },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/member-login" ||
    pathname.startsWith("/walk-in") ||
    pathname.startsWith("/api/auth")
  );
}

export function isPathAllowed(pathname: string, role: UserRole): boolean {
  if (isPublicPath(pathname)) return true;
  const pathIs = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

  if (role === "COORDINATOR") {
    return (
      pathIs("/dashboard") ||
      pathIs("/events") ||
      pathIs("/members") ||
      pathIs("/guidance") ||
      pathIs("/reports") ||
      pathIs("/api/reports") ||
      pathIs("/notifications")
    );
  }

  return (
    pathIs("/home") ||
    pathIs("/my-events") ||
    pathIs("/request-guidance") ||
    pathIs("/profile") ||
    pathIs("/notifications") ||
    pathIs("/walk-in")
  );
}

export function canViewReports(role: UserRole): boolean {
  return role === "COORDINATOR";
}
