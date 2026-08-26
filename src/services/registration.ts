import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logSafe } from "@/lib/log";
import { notifyUser } from "@/services/notifications";
import { advanceRegistrationCapacity } from "@/lib/capacity";
import { registrationConfirmationEmail } from "@/lib/registration-email";
import type { SessionUser } from "@/types";

async function requireMember(user: SessionUser) {
  if (user.role !== "MEMBER" || !user.memberId) {
    throw new AppError("Only members can register for events.", 403);
  }
  const member = await prisma.member.findUnique({ where: { id: user.memberId } });
  if (!member?.active) throw new AppError("Your profile is not active.", 403);
  return member;
}

export async function registerForEvent(user: SessionUser, eventId: string) {
  const member = await requireMember(user);
  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event || event.status !== "PUBLISHED") {
      throw new AppError("This event is not open for registration.", 400);
    }
    if (new Date() > event.registrationDeadline) {
      throw new AppError("Registration is closed for this event.", 400);
    }
    const existing = await tx.eventRegistration.findUnique({
      where: { eventId_memberId: { eventId, memberId: member.id } },
    });
    if (existing && existing.status !== "CANCELLED") {
      throw new AppError("You are already registered or waitlisted for this event.", 400);
    }

    const advanceCapacity = advanceRegistrationCapacity(event.capacity, event.walkInCapacity);
    const registeredCount = await tx.eventRegistration.count({
      where: { eventId, status: "REGISTERED", type: "STANDARD" },
    });

    if (registeredCount < advanceCapacity) {
      const row = existing
        ? await tx.eventRegistration.update({
            where: { id: existing.id },
            data: {
              status: "REGISTERED",
              type: "STANDARD",
              waitlistPosition: null,
              checkInStatus: "REGISTERED",
              cancelledAt: null,
              userId: user.id,
            },
          })
        : await tx.eventRegistration.create({
            data: {
              eventId,
              memberId: member.id,
              userId: user.id,
              status: "REGISTERED",
              type: "STANDARD",
              checkInStatus: "REGISTERED",
            },
          });
      logSafe("registration.confirmed", { eventId, memberId: member.id });
      return { kind: "REGISTERED" as const, row, event };
    }

    const last = await tx.eventRegistration.findFirst({
      where: { eventId, status: "WAITLISTED" },
      orderBy: { waitlistPosition: "desc" },
    });
    const position = (last?.waitlistPosition ?? 0) + 1;
    const row = existing
      ? await tx.eventRegistration.update({
          where: { id: existing.id },
          data: {
            status: "WAITLISTED",
            type: "STANDARD",
            waitlistPosition: position,
            cancelledAt: null,
            userId: user.id,
          },
        })
      : await tx.eventRegistration.create({
          data: {
            eventId,
            memberId: member.id,
            userId: user.id,
            status: "WAITLISTED",
            type: "STANDARD",
            waitlistPosition: position,
          },
        });
    logSafe("registration.waitlisted", { eventId, memberId: member.id, position });
    return { kind: "WAITLISTED" as const, row, event };
  });

  if (result.kind === "REGISTERED") {
    const email = registrationConfirmationEmail({
      memberName: `${member.firstName} ${member.lastName}`.trim(),
      eventTitle: result.event.title,
      eventDate: result.event.eventDate,
      startTime: result.event.startTime,
      endTime: result.event.endTime,
      location: result.event.location,
      speakerName: result.event.speakerName,
      speakerTitle: result.event.speakerTitle,
      speakerOrganization: result.event.speakerOrganization,
    });
    await notifyUser({
      userId: user.id,
      title: "Registration confirmed",
      message: `You are registered for ${result.event.title}.`,
      href: "/my-events",
      email: { to: member.email, subject: email.subject, text: email.text },
    });
  } else {
    await notifyUser({
      userId: user.id,
      title: "Joined waitlist",
      message: `You are on the waitlist for ${result.event.title}.`,
      href: "/my-events",
    });
  }

  return result;
}

export async function cancelRegistration(user: SessionUser, eventId: string) {
  const member = await requireMember(user);
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.eventRegistration.findUnique({
      where: { eventId_memberId: { eventId, memberId: member.id } },
    });
    if (!existing || existing.status === "CANCELLED") {
      throw new AppError("No active registration to cancel.", 400);
    }
    if (existing.checkInStatus === "CHECKED_IN") {
      throw new AppError("You cannot cancel after check-in.", 400);
    }
    await tx.eventRegistration.update({
      where: { id: existing.id },
      data: { status: "CANCELLED", cancelledAt: new Date(), waitlistPosition: null },
    });
    if (existing.status === "REGISTERED" && existing.type !== "WALK_IN") {
      const next = await tx.eventRegistration.findFirst({
        where: { eventId, status: "WAITLISTED" },
        orderBy: { waitlistPosition: "asc" },
      });
      if (next) {
        await tx.eventRegistration.update({
          where: { id: next.id },
          data: {
            status: "REGISTERED",
            waitlistPosition: null,
            checkInStatus: "REGISTERED",
            promotedAt: new Date(),
          },
        });
        return { promotedMemberId: next.memberId, eventId };
      }
    }
    return { promotedMemberId: null, eventId };
  });

  logSafe("registration.cancelled", { eventId, memberId: member.id });
  if (result.promotedMemberId) {
    const [event, promoted] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId } }),
      prisma.member.findUnique({ where: { id: result.promotedMemberId } }),
    ]);
    const promotedUser = await prisma.user.findUnique({ where: { email: promoted?.email ?? "" } });
    if (event && promoted && promotedUser) {
      await notifyUser({
        userId: promotedUser.id,
        title: "You are registered",
        message: `A spot opened for ${event.title}. You have been moved off the waitlist.`,
        href: "/my-events",
        email: {
          to: promoted.email,
          subject: `You are in: ${event.title}`,
          text: `A registered guest cancelled. You are now registered for ${event.title}.`,
        },
      });
      logSafe("waitlist.promoted", { eventId, memberId: promoted.id });
    }
  }
}

export async function listMyRegistrations(memberId: string) {
  return prisma.eventRegistration.findMany({
    where: { memberId, status: { not: "CANCELLED" } },
    include: { event: true },
    orderBy: { event: { eventDate: "asc" } },
  });
}

export async function registerWalkIn(user: SessionUser, eventId: string) {
  const member = await requireMember(user);
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || (event.status !== "PUBLISHED" && event.status !== "REGISTRATION_CLOSED")) {
    throw new AppError("Walk-in registration is not available.", 400);
  }
  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_memberId: { eventId, memberId: member.id } },
  });
  if (existing?.status === "REGISTERED") {
    return { kind: "ALREADY" as const, row: existing };
  }
  const walkIns = await prisma.eventRegistration.count({
    where: { eventId, status: "REGISTERED", type: "WALK_IN" },
  });
  const totalRegistered = await prisma.eventRegistration.count({
    where: { eventId, status: "REGISTERED" },
  });
  if (walkIns >= event.walkInCapacity || totalRegistered >= event.capacity) {
    logSafe("walkin.full", { eventId, memberId: member.id });
    return { kind: "FULL" as const, row: null };
  }
  const row = existing
    ? await prisma.eventRegistration.update({
        where: { id: existing.id },
        data: {
          status: "REGISTERED",
          type: "WALK_IN",
          waitlistPosition: null,
          checkInStatus: "REGISTERED",
          cancelledAt: null,
          userId: user.id,
        },
      })
    : await prisma.eventRegistration.create({
        data: {
          eventId,
          memberId: member.id,
          userId: user.id,
          type: "WALK_IN",
          status: "REGISTERED",
          checkInStatus: "REGISTERED",
        },
      });
  logSafe("walkin.registered", { eventId, memberId: member.id });
  return { kind: "REGISTERED" as const, row };
}

export async function checkInMember(actor: SessionUser, registrationId: string) {
  if (actor.role !== "COORDINATOR") throw new AppError("Only coordinators can check in guests.", 403);
  const row = await prisma.eventRegistration.findUnique({
    where: { id: registrationId },
    include: { event: true },
  });
  if (!row || row.status !== "REGISTERED") throw new AppError("This person is not registered.", 400);
  if (row.checkInStatus === "CHECKED_IN") throw new AppError("Already checked in.", 400);
  if (new Date() < row.event.checkInOpensAt) {
    throw new AppError("Check-in is not open yet.", 400);
  }
  const updated = await prisma.eventRegistration.update({
    where: { id: registrationId },
    data: {
      checkInStatus: "CHECKED_IN",
      checkedInAt: new Date(),
      checkedInById: actor.id,
    },
  });
  logSafe("checkin.recorded", { registrationId, eventId: row.eventId });
  return updated;
}
