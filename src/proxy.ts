import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { defaultHomePath, isPathAllowed, isPublicPath } from "@/lib/authorization";
import type { UserRole } from "@/types/roles";

const { auth } = NextAuth(authConfig);

const handler = auth((req) => {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const role = req.auth?.user?.role as UserRole | undefined;
  if (!req.auth?.user || !role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("error", "session");
    if (pathname.startsWith("/walk-in")) url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!isPathAllowed(pathname, role)) {
    return NextResponse.redirect(new URL(defaultHomePath(role), req.nextUrl.origin));
  }
  return NextResponse.next();
});

export default handler;
export const proxy = handler;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
