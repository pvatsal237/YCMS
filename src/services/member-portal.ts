import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { SessionUser } from "@/types";

export async function getMemberPortalData(actor: SessionUser) {
  if (actor.role !== "MEMBER") {
    throw new AppError(
      "You do not have permission to perform this action.",
      403,
      "FORBIDDEN",
    );
  }
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { memberId: true, email: true },
  });
  const member = await prisma.member.findFirst({
    where: {
      active: true,
      OR: [
        user?.memberId ? { id: user.memberId } : undefined,
        { email: actor.email },
      ].filter(Boolean) as Array<{ id: string } | { email: string }>,
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
  if (!member || (user?.memberId && member.id !== user.memberId)) {
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
  const data = await getMemberPortalData(actor);
  await prisma.memberProfileChangeRequest.create({
    data: {
      memberId: data.member.id,
      message: message.trim(),
    },
  });
}
