import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { notifyUser } from "@/services/notifications";
import { eventTimeLabel } from "@/services/events";
import { appUrl } from "@/lib/privacy";
import type { RegistrationType } from "@prisma/client";

function registrationOpen(event: {
  status: string;
  registrationDeadline: Date;
}) {
  return event.status === "PUBLISHED" && event.registrationDeadline.getTime() > Date.now();
}

export async function memberRegistrationMap(memberId: string, eventIds: string[]) {
  if (eventIds.length === 0) return new Map();
  const rows = await prisma.eventRegistration.findMany({
    where: { memberId, eventId: { in: eventIds }, status: { in: ["REGISTERED", "WAITLISTED"] } },
  });
  return new Map(rows.map((row) => [row.eventId, row]));
}

export async function registerForEvent(eventId: string, memberId: string) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError("Event not found.", 404);
    if (event.status === "CANCELLED") throw new AppError("This event has been cancelled.");
    if (!registrationOpen(event)) {
      throw new AppError("Registration is closed for this event.");
    }

    const existing = await tx.eventRegistration.findUnique({
      where: { eventId_memberId: { eventId, memberId } },
    });
    if (existing?.status === "REGISTERED") {
      throw new AppError("You are already registered for this event.");
    }
    if (existing?.status === "WAITLISTED") {
      throw new AppError("You are already on the waitlist.");
    }

    const registeredCount = await tx.eventRegistration.count({
      where: { eventId, status: "REGISTERED" },
    });
    if (registeredCount >= event.capacity) {
      throw new AppError("SPOTS_FULL");
    }

    return tx.eventRegistration.upsert({
      where: { eventId_memberId: { eventId, memberId } },
      update: {
        status: "REGISTERED",
        type: "NORMAL",
        waitlistPosition: null,
        cancelledAt: null,
        promotedAt: null,
      },
      create: { eventId, memberId, status: "REGISTERED", type: "NORMAL" },
    });
  });
}

export async function joinWaitlist(eventId: string, memberId: string) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError("Event not found.", 404);
    if (!registrationOpen(event)) {
      throw new AppError("Registration is closed for this event.");
    }
    const registeredCount = await tx.eventRegistration.count({
      where: { eventId, status: "REGISTERED" },
    });
    if (registeredCount < event.capacity) {
      throw new AppError("Spots are still available. Please register instead.");
    }
    const existing = await tx.eventRegistration.findUnique({
      where: { eventId_memberId: { eventId, memberId } },
    });
    if (existing?.status === "REGISTERED") {
      throw new AppError("You are already registered for this event.");
    }
    if (existing?.status === "WAITLISTED") {
      throw new AppError("You are already on the waitlist.");
    }
    const last = await tx.eventRegistration.aggregate({
      where: { eventId, status: "WAITLISTED" },
      _max: { waitlistPosition: true },
    });
    const position = (last._max.waitlistPosition ?? 0) + 1;
    return tx.eventRegistration.upsert({
      where: { eventId_memberId: { eventId, memberId } },
      update: {
        status: "WAITLISTED",
        waitlistPosition: position,
        cancelledAt: null,
        type: "NORMAL",
      },
      create: {
        eventId,
        memberId,
        status: "WAITLISTED",
        waitlistPosition: position,
        type: "NORMAL",
      },
    });
  });
}

async function promoteNextWaitlisted(eventId: string) {
  const next = await prisma.eventRegistration.findFirst({
    where: { eventId, status: "WAITLISTED" },
    orderBy: [{ waitlistPosition: "asc" }, { createdAt: "asc" }],
    include: { member: { include: { loginUser: true } }, event: true },
  });
  if (!next) return null;
  const promoted = await prisma.eventRegistration.update({
    where: { id: next.id },
    data: {
      status: "REGISTERED",
      promotedAt: new Date(),
      waitlistPosition: null,
    },
  });
  if (next.member.loginUser) {
    const when = eventTimeLabel(next.event);
    await notifyUser({
      userId: next.member.loginUser.id,
      title: "A spot opened up",
      body: `You now have a spot at ${next.event.title}.`,
      href: "/portal/events",
      email: {
        to: next.member.email,
        subject: `You're registered: ${next.event.title}`,
        text: `A waitlist spot opened and you are now registered for ${next.event.title}.\n\n${when}\n${next.event.location}\n\n${appUrl("/portal/events")}`,
      },
    });
  }
  return promoted;
}

export async function cancelRegistration(eventId: string, memberId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError("Event not found.", 404);
  if (event.registrationDeadline.getTime() <= Date.now()) {
    throw new AppError("The registration deadline has passed.");
  }
  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_memberId: { eventId, memberId } },
  });
  if (!existing || existing.status === "CANCELLED") {
    throw new AppError("You do not have an active registration.");
  }
  const wasRegistered = existing.status === "REGISTERED";
  await prisma.eventRegistration.update({
    where: { id: existing.id },
    data: { status: "CANCELLED", cancelledAt: new Date(), waitlistPosition: null },
  });
  if (wasRegistered) {
    await promoteNextWaitlisted(eventId);
  }
}

export async function registerWalkIn(eventId: string, memberId: string, token: string) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event || event.walkInToken !== token) {
      throw new AppError("This walk-in link is not valid.", 404);
    }
    if (event.status === "CANCELLED" || event.status === "DRAFT") {
      throw new AppError("Walk-in registration is not available for this event.");
    }
    const existing = await tx.eventRegistration.findUnique({
      where: { eventId_memberId: { eventId, memberId } },
    });
    if (existing?.status === "REGISTERED") {
      return { registration: existing, created: false, full: false };
    }
    const walkIns = await tx.eventRegistration.count({
      where: { eventId, status: "REGISTERED", type: "WALK_IN" },
    });
    if (walkIns >= event.walkInCapacity) {
      return { registration: null, created: false, full: true };
    }
    const registration = await tx.eventRegistration.upsert({
      where: { eventId_memberId: { eventId, memberId } },
      update: {
        status: "REGISTERED",
        type: "WALK_IN",
        cancelledAt: null,
        waitlistPosition: null,
      },
      create: { eventId, memberId, status: "REGISTERED", type: "WALK_IN" as RegistrationType },
    });
    return { registration, created: true, full: false };
  });
}

export async function listEventRegistrations(eventId: string) {
  return prisma.eventRegistration.findMany({
    where: { eventId, status: { in: ["REGISTERED", "WAITLISTED"] } },
    include: { member: true },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
}
