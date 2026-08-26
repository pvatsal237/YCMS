import { encode } from "@auth/core/jwt";
import { cookies } from "next/headers";
import { SESSION_SECONDS } from "@/lib/session-ttl";
import type { UserRole } from "@/types/roles";

export async function setAuthjsSessionCookie(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  memberId?: string | null;
}) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }

  const secure = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  const name = `${secure ? "__Secure-" : ""}authjs.session-token`;
  const sessionToken = await encode({
    salt: name,
    secret,
    maxAge: SESSION_SECONDS,
    token: {
      sub: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      memberId: user.memberId ?? null,
    },
  });

  const jar = await cookies();
  jar.set(name, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: SESSION_SECONDS,
  });
}
