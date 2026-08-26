import type { UserRole } from "@/types/roles";

export type NavItem = {
  href: string;
  label: string;
  roles: UserRole[];
};

export function defaultHomePath(role: UserRole | string | null | undefined): string {
  if (role === "COORDINATOR") return "/dashboard";
  if (role === "MEMBER") return "/home";
  return "/login";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["COORDINATOR"] },
  { href: "/events", label: "Events", roles: ["COORDINATOR"] },
  { href: "/members", label: "Members", roles: ["COORDINATOR"] },
  { href: "/guidance", label: "Guidance", roles: ["COORDINATOR"] },
  { href: "/reports", label: "Reports", roles: ["COORDINATOR"] },
  { href: "/notifications", label: "Notifications", roles: ["COORDINATOR"] },
  { href: "/home", label: "Home", roles: ["MEMBER"] },
  { href: "/my-events", label: "My Events", roles: ["MEMBER"] },
  { href: "/request-guidance", label: "Request Guidance", roles: ["MEMBER"] },
  { href: "/profile", label: "Profile", roles: ["MEMBER"] },
  { href: "/notifications", label: "Notifications", roles: ["MEMBER"] },
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
