import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { isPathAllowed } from "@/lib/authorization";
import type { UserRole } from "@/types/roles";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/unauthorized"
  ) {
    return NextResponse.next();
  }

  const role = req.auth?.user?.role as UserRole | undefined;
  if (!req.auth?.user || !role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") {
      url.searchParams.set("error", "session");
    }
    return NextResponse.redirect(url);
  }

  if (!isPathAllowed(pathname, role)) {
    return NextResponse.redirect(new URL("/unauthorized", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
