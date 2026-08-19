import { prisma } from "@/lib/prisma";

export type LoginKind = "staff" | "member" | "unknown";

export async function identifyLoginKind(emailRaw: string): Promise<LoginKind> {
  const email = emailRaw.trim().toLowerCase();
  if (!email) return "unknown";
  const user = await prisma.user.findFirst({
    where: { email, active: true },
    select: { role: true, passwordHash: true },
  });
  if (!user) return "unknown";
  if (user.role === "MEMBER") return "member";
  if (user.passwordHash) return "staff";
  return "unknown";
}
