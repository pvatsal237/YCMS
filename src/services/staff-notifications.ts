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
      requestId: string | null;
    }[]
  >`
    SELECT id, title, message, "readAt", "createdAt", "memberId", "requestId"
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
  memberId?: string | null;
  requestId: string;
  title: string;
  message: string;
}) {
  await ensureMemberAuthSchema();
  const updated = await prisma.$executeRaw`
    UPDATE "StaffNotification"
    SET title = ${input.title},
        message = ${input.message},
        "memberId" = ${input.memberId ?? null},
        "readAt" = NULL
    WHERE "userId" = ${input.userId} AND "requestId" = ${input.requestId}
  `;
  if (Number(updated) > 0) return;
  await prisma.$executeRaw`
    INSERT INTO "StaffNotification"
      (id, "userId", "memberId", "requestId", title, message, "createdAt")
    VALUES (
      ${randomUUID()},
      ${input.userId},
      ${input.memberId ?? null},
      ${input.requestId},
      ${input.title},
      ${input.message},
      NOW()
    )
  `;
}

export async function deleteStaffingOpportunityNotifications(requestId: string) {
  await ensureMemberAuthSchema();
  await prisma.$executeRaw`
    DELETE FROM "StaffNotification"
    WHERE "requestId" = ${requestId}
      AND title LIKE ${"%more volunteer%"}
  `;
}
