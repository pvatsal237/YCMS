import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/lib/activity-log";
import { THREE_CONSECUTIVE_ABSENCE_REASON } from "@/lib/constants";
import {
  countConsecutiveAbsences,
} from "@/utils/consecutive-absences";
import { getLastAttendanceDate } from "@/services/attendance";
import type { FollowUpUpdateInput } from "@/validations/follow-up";
import type { SessionUser } from "@/types";
import type { FollowUpStatus, Prisma } from "@prisma/client";

export async function listFollowUps(filters?: {
  status?: FollowUpStatus;
  q?: string;
}) {
  const where: Prisma.FollowUpWhereInput = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.q) {
    where.member = {
      OR: [
        { firstName: { contains: filters.q, mode: "insensitive" } },
        { lastName: { contains: filters.q, mode: "insensitive" } },
        { phone: { contains: filters.q } },
      ],
    };
  }

  const followUps = await prisma.followUp.findMany({
    where,
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const meetups = await prisma.meetup.findMany({
    where: { active: true },
    orderBy: { meetupDate: "desc" },
    select: { id: true },
  });

  const attendance = await prisma.attendance.findMany({
    where: { memberId: { in: followUps.map((item) => item.memberId) } },
    select: { memberId: true, meetupId: true, status: true },
  });

  return Promise.all(
    followUps.map(async (item) => {
      const byMeetup = Object.fromEntries(
        attendance
          .filter((row) => row.memberId === item.memberId)
          .map((row) => [row.meetupId, row]),
      );
      return {
        ...item,
        lastAttendanceDate: await getLastAttendanceDate(item.memberId),
        consecutiveAbsences: countConsecutiveAbsences(meetups, byMeetup),
      };
    }),
  );
}

export async function getFollowUp(id: string) {
  const followUp = await prisma.followUp.findUnique({
    where: { id },
    include: {
      member: true,
      assignedTo: true,
    },
  });
  if (!followUp) {
    throw new AppError("Follow-up not found.", 404, "NOT_FOUND");
  }
  const meetups = await prisma.meetup.findMany({
    where: { active: true },
    orderBy: { meetupDate: "desc" },
    select: { id: true },
  });
  const attendance = await prisma.attendance.findMany({
    where: { memberId: followUp.memberId },
    select: { meetupId: true, status: true },
  });
  const byMeetup = Object.fromEntries(
    attendance.map((row) => [row.meetupId, row]),
  );
  return {
    ...followUp,
    lastAttendanceDate: await getLastAttendanceDate(followUp.memberId),
    consecutiveAbsences: countConsecutiveAbsences(meetups, byMeetup),
  };
}

export async function updateFollowUp(
  input: FollowUpUpdateInput,
  actor: SessionUser,
) {
  const existing = await prisma.followUp.findUnique({ where: { id: input.id } });
  if (!existing) {
    throw new AppError("Follow-up not found.", 404, "NOT_FOUND");
  }

  const completed =
    input.status === "COMPLETED" || input.status === "UNABLE_TO_REACH";

  const updated = await prisma.followUp.update({
    where: { id: input.id },
    data: {
      status: input.status,
      assignedToId: input.assignedToId || null,
      notes: input.notes,
      completedAt: completed ? new Date() : null,
    },
  });

  await logActivity({
    userId: actor.id,
    action: "FOLLOW_UP_UPDATED",
    entityType: "FollowUp",
    entityId: updated.id,
    message: `${actor.name} updated follow-up to ${input.status}`,
  });
  return updated;
}

export async function listOpenAbsenceFollowUps(take = 8) {
  return prisma.followUp.findMany({
    where: {
      reason: THREE_CONSECUTIVE_ABSENCE_REASON,
      status: { in: ["PENDING", "CONTACTED"] },
    },
    include: {
      member: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function listAssignableCoordinators() {
  return prisma.user.findMany({
    where: {
      active: true,
      role: { in: ["ADMIN", "COORDINATOR"] },
    },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}
