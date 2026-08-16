import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppError } from "@/lib/errors";
import { defaultHomePath } from "@/lib/authorization";
import type { UserRole } from "@/types/roles";
import type { SessionUser } from "@/types";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.active) {
    redirect("/login?error=disabled");
  }
  return user;
}

export async function requireMemberSession(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== "MEMBER") {
    redirect(defaultHomePath(user.role));
  }
  return user;
}

export async function requireStaffSession(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role === "MEMBER") {
    redirect("/portal");
  }
  return user;
}

export async function requireRole(roles: UserRole[]): Promise<SessionUser> {
  const user = await requireSession();
  if (!roles.includes(user.role)) {
    redirect("/unauthorized");
  }
  return user;
}

export async function requireRoleAction(roles: UserRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AppError("Session expired. Please sign in again.", 401, "SESSION_EXPIRED");
  }
  if (!user.active) {
    throw new AppError("This account has been disabled.", 403, "DISABLED");
  }
  if (!roles.includes(user.role)) {
    throw new AppError(
      "You do not have permission to perform this action.",
      403,
      "FORBIDDEN",
    );
  }
  return user;
}
