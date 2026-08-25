import type { UserRole } from "@/types/roles";

export const APP_NAME = "International Youth Community Meetup";
export const APP_SHORT_NAME = "IYCM";

export function defaultHomePath(role: UserRole | string | null | undefined): string {
  if (role === "MEMBER") return "/portal";
  if (role === "COORDINATOR") return "/dashboard";
  return "/login";
}

export type NavItem = {
  href: string;
  label: string;
  roles: UserRole[];
};

export const COORDINATOR_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["COORDINATOR"] },
  { href: "/events", label: "Events", roles: ["COORDINATOR"] },
  { href: "/members", label: "Members", roles: ["COORDINATOR"] },
  { href: "/guidance", label: "Guidance", roles: ["COORDINATOR"] },
  { href: "/reports", label: "Reports", roles: ["COORDINATOR"] },
  { href: "/notifications", label: "Notifications", roles: ["COORDINATOR"] },
];

export const MEMBER_NAV: NavItem[] = [
  { href: "/portal", label: "Home", roles: ["MEMBER"] },
  { href: "/portal/events", label: "My Events", roles: ["MEMBER"] },
  { href: "/portal/guidance", label: "Request Guidance", roles: ["MEMBER"] },
  { href: "/portal/profile", label: "Profile", roles: ["MEMBER"] },
  { href: "/portal/notifications", label: "Notifications", roles: ["MEMBER"] },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  return role === "COORDINATOR" ? COORDINATOR_NAV : MEMBER_NAV;
}

export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/unauthorized" ||
    pathname === "/login" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/walk-in") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron")
  );
}

export function isPathAllowed(pathname: string, role: UserRole): boolean {
  if (isPublicPath(pathname)) return true;
  if (role === "MEMBER") {
    return pathname.startsWith("/portal");
  }
  if (pathname.startsWith("/portal")) return false;
  const pathIs = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  if (pathIs("/dashboard")) return true;
  if (pathIs("/events")) return true;
  if (pathIs("/members")) return true;
  if (pathIs("/guidance")) return true;
  if (pathIs("/reports")) return true;
  if (pathIs("/notifications")) return true;
  return false;
}
