import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type LogInput = {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export async function logActivity(input: LogInput) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        message: input.message,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("[YCMS] Failed to write activity log", error);
  }
}
