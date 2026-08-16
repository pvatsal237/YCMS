import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { ensureMemberAuthSchema } from "@/lib/member-auth-schema";
import type { SessionUser } from "@/types";

export async function getMemberPortalData(actor: SessionUser) {
  if (actor.role !== "MEMBER") {
    throw new AppError(
      "You do not have permission to perform this action.",
      403,
      "FORBIDDEN",
    );
  }

  const member = await prisma.member.findFirst({
    where: {
      active: true,
      email: actor.email,
    },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      phone: true,
      dateJoined: true,
      documents: {
        select: {
          documentType: true,
          expiryDate: true,
        },
        orderBy: { expiryDate: "asc" },
      },
      attendance: {
        select: {
          status: true,
          meetup: { select: { meetupDate: true, title: true, location: true } },
        },
        orderBy: { meetup: { meetupDate: "desc" } },
        take: 20,
      },
      followUps: {
        select: {
          status: true,
          lastOutcome: true,
          nextFollowUpAt: true,
          reason: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!member) {
    throw new AppError("You do not have permission to perform this action.", 403);
  }

  const upcomingMeetup = await prisma.meetup.findFirst({
    where: { active: true, meetupDate: { gte: new Date() } },
    orderBy: { meetupDate: "asc" },
    select: { title: true, meetupDate: true, location: true },
  });

  return { member, upcomingMeetup };
}

export async function createProfileChangeRequest(actor: SessionUser, message: string) {
  await ensureMemberAuthSchema();
  const data = await getMemberPortalData(actor);
  await prisma.$executeRaw`
    INSERT INTO "MemberProfileChangeRequest" (id, "memberId", message, status, "createdAt")
    VALUES (${randomUUID()}, ${data.member.id}, ${message.trim()}, 'PENDING', NOW())
  `;
}
