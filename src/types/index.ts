import type { UserRole } from "@/types/roles";
import type { DefaultSession } from "next-auth";
import "next-auth/jwt";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  active: boolean;
  memberId?: string | null;
};

export type ActionResult<T = unknown> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };

declare module "next-auth" {
  interface Session {
    user: SessionUser & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    active: boolean;
    memberId?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    active: boolean;
    memberId?: string | null;
  }
}
