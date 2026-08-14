import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { parseDateOnly } from "@/lib/dates";
import { logActivity } from "@/lib/activity-log";
import {
  THREE_CONSECUTIVE_ABSENCE_REASON,
  OPEN_FOLLOW_UP_STATUSES,
} from "@/lib/constants";
import {
  countConsecutiveAbsences,
  shouldOpenThreeAbsenceFollowUp,
} from "@/utils/consecutive-absences";
import type { MeetupInput } from "@/validations/attendance";
import type { SessionUser } from "@/types";
import type { AttendanceStatus } from "@prisma/client";

export async function listMeetups() {
  const meetups = await prisma.meetup.findMany({
    orderBy: { meetupDate: "desc" },
    include: {
      attendance: true,
      createdBy: { select: { name: true } },
    },
  });

  const activeMemberCount = await prisma.member.count({ where: { active: true } });

  return meetups.map((meetup) => {
    const present = meetup.attendance.filter((row) => row.status === "PRESENT").length;
    const absent = meetup.attendance.filter((row) => row.status === "ABSENT").length;
    const excused = meetup.attendance.filter((row) => row.status === "EXCUSED").length;
    const recorded = meetup.attendance.length;
    const percentage = recorded === 0 ? 0 : Math.round((present / recorded) * 100);
    return {
      ...meetup,
      present,
      absent,
      excused,
      recorded,
      totalMembers: activeMemberCount,
      attendancePercentage: percentage,
    };
  });
}

export async function getMeetup(id: string) {
  const meetup = await prisma.meetup.findUnique({
    where: { id },
    include: {
      attendance: true,
      createdBy: { select: { name: true } },
    },
  });
  if (!meetup) {
    throw new AppError("Unable to load attendance.", 404, "NOT_FOUND");
  }
  return meetup;
}

export async function getLatestMeetup() {
  return prisma.meetup.findFirst({
    where: { active: true },
    orderBy: { meetupDate: "desc" },
    include: { attendance: true },
  });
}

export async function createMeetup(input: MeetupInput, actor: SessionUser) {
  const meetup = await prisma.meetup.create({
    data: {
      meetupDate: parseDateOnly(input.meetupDate),
      title: input.title,
      location: input.location,
      createdById: actor.id,
    },
  });
  await logActivity({
    userId: actor.id,
    action: "MEETUP_CREATED",
    entityType: "Meetup",
    entityId: meetup.id,
    message: `${actor.name} created meetup ${input.title} on ${input.meetupDate}`,
  });
  return meetup;
}

export async function listAttendanceMembers(query?: string) {
  const where: Prisma.MemberWhereInput = { active: true };
  if (query?.trim()) {
    const term = query.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { phone: { contains: term } },
    ];
  }
  return prisma.member.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function saveAttendance(
  meetupId: string,
  marks: Array<{ memberId: string; status: AttendanceStatus }>,
  actor: SessionUser,
) {
  const meetup = await prisma.meetup.findUnique({ where: { id: meetupId } });
  if (!meetup) {
    throw new AppError("Unable to load attendance.", 404, "NOT_FOUND");
  }

  const memberIds = [...new Set(marks.map((mark) => mark.memberId))];
  if (memberIds.length !== marks.length) {
    throw new AppError(
      "Duplicate attendance for one member/meetup is not allowed.",
      409,
      "DUPLICATE_ATTENDANCE",
    );
  }

  try {
    await prisma.$transaction(
      marks.map((mark) =>
        prisma.attendance.upsert({
          where: {
            meetupId_memberId: { meetupId, memberId: mark.memberId },
          },
          update: {
            status: mark.status,
            recordedById: actor.id,
            recordedAt: new Date(),
          },
          create: {
            meetupId,
            memberId: mark.memberId,
            status: mark.status,
            recordedById: actor.id,
          },
        }),
      ),
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        "Duplicate attendance for one member/meetup is not allowed.",
        409,
        "DUPLICATE_ATTENDANCE",
      );
    }
    throw new AppError("Unable to load attendance. Please try again.", 500);
  }

  await evaluateConsecutiveAbsences(actor.id);
  await logActivity({
    userId: actor.id,
    action: "ATTENDANCE_UPDATED",
    entityType: "Meetup",
    entityId: meetupId,
    message: `${actor.name} updated attendance for ${meetup.title}`,
    metadata: { count: marks.length },
  });
}

export async function evaluateConsecutiveAbsences(actorId?: string) {
  const meetups = await prisma.meetup.findMany({
    where: { active: true },
    orderBy: { meetupDate: "desc" },
    select: { id: true },
  });
  if (meetups.length === 0) return { created: 0 };

  const members = await prisma.member.findMany({
    where: { active: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      attendance: {
        select: { meetupId: true, status: true },
      },
      followUps: {
        where: {
          reason: THREE_CONSECUTIVE_ABSENCE_REASON,
          status: { in: [...OPEN_FOLLOW_UP_STATUSES] },
        },
        select: { id: true },
      },
    },
  });

  let created = 0;
  for (const member of members) {
    const attendanceByMeetupId = Object.fromEntries(
      member.attendance.map((row) => [row.meetupId, row]),
    );
    const consecutive = countConsecutiveAbsences(meetups, attendanceByMeetupId);
    const hasOpen = member.followUps.length > 0;
    if (shouldOpenThreeAbsenceFollowUp(consecutive, hasOpen)) {
      await prisma.followUp.create({
        data: {
          memberId: member.id,
          reason: THREE_CONSECUTIVE_ABSENCE_REASON,
          status: "PENDING",
          notes: `Automatically created after ${consecutive} consecutive absences.`,
        },
      });
      created += 1;
      await logActivity({
        userId: actorId,
        action: "FOLLOW_UP_CREATED",
        entityType: "FollowUp",
        entityId: member.id,
        message: `Follow-up opened for ${member.firstName} ${member.lastName} after ${consecutive} consecutive absences`,
      });
    }
  }

  return { created };
}

export async function getLastAttendanceDate(memberId: string) {
  const present = await prisma.attendance.findFirst({
    where: { memberId, status: "PRESENT" },
    orderBy: { meetup: { meetupDate: "desc" } },
    include: { meetup: true },
  });
  return present?.meetup.meetupDate ?? null;
}
