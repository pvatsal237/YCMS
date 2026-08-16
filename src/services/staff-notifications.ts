import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureMemberAuthSchema } from "@/lib/member-auth-schema";

export async function countUnreadStaffNotifications(userId: string) {
  await ensureMemberAuthSchema();
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*)::bigint AS n
    FROM "StaffNotification"
    WHERE "userId" = ${userId} AND "readAt" IS NULL
  `;
  return Number(rows[0]?.n ?? 0);
}

export async function listStaffNotifications(userId: string) {
  await ensureMemberAuthSchema();
  return prisma.$queryRaw<
    {
      id: string;
      title: string;
      message: string;
      readAt: Date | null;
      createdAt: Date;
      memberId: string | null;
    }[]
  >`
    SELECT id, title, message, "readAt", "createdAt", "memberId"
    FROM "StaffNotification"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC
    LIMIT 50
  `;
}

export async function markStaffNotificationsRead(userId: string) {
  await ensureMemberAuthSchema();
  await prisma.$executeRaw`
    UPDATE "StaffNotification"
    SET "readAt" = NOW()
    WHERE "userId" = ${userId} AND "readAt" IS NULL
  `;
}

export async function createStaffNotification(input: {
  userId: string;
  memberId: string;
  requestId: string;
  title: string;
  message: string;
}) {
  await ensureMemberAuthSchema();
  await prisma.$executeRaw`
    INSERT INTO "StaffNotification"
      (id, "userId", "memberId", "requestId", title, message, "createdAt")
    VALUES (
      ${randomUUID()},
      ${input.userId},
      ${input.memberId},
      ${input.requestId},
      ${input.title},
      ${input.message},
      NOW()
    )
  `;
}
