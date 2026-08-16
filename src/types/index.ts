import type { UserRole } from "@/types/roles";
import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  memberId?: string | null;
};

export type ActionResult<T = unknown> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };

export type MemberListFilters = {
  q?: string;
  immigrationStatus?: string;
  college?: string;
  employer?: string;
  active?: string;
  attendanceStatus?: string;
  permitExpiryFrom?: string;
  permitExpiryTo?: string;
  sort?: string;
  page?: number;
};

declare module "next-auth" {
  interface Session {
    user: SessionUser & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    active: boolean;
    memberId?: string | null;
    trustDevice?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    active: boolean;
    memberId?: string | null;
  }
}
