import { prisma } from "@/lib/prisma";
import { AppError, logServerError } from "@/lib/errors";
import { logSafe } from "@/lib/log";
import { notifyUser } from "@/services/notifications";
import { parseDateOnly, parseEventDate, parseTimeOfDay, timeToMinutes } from "@/lib/dates";
import { advanceRegistrationCapacity } from "@/lib/capacity";
import { defaultCheckInOpensAt, defaultDeadline } from "@/lib/event-schedule";
import { sanitizeEventText } from "@/lib/sanitize-text";
import type { EventStatus } from "@prisma/client";
import type { SessionUser } from "@/types";

export { defaultCheckInOpensAt, defaultDeadline } from "@/lib/event-schedule";

export type EventInput = {
  title: string;
  description: string;
  speakerName?: string;
  speakerTitle?: string;
  speakerOrganization?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  walkInCapacity?: number;
  registrationDeadline?: string;
  checkInOpensAt?: string;
  internalNotes?: string;
  status?: EventStatus;
};

function optionalText(value?: string | null) {
  const cleaned = sanitizeEventText(value);
  return cleaned || null;
}

function requiredText(value: unknown, label: string) {
  const cleaned = sanitizeEventText(value);
  if (!cleaned) throw new AppError(`${label} is required.`, 400);
  return cleaned;
}

function parseCapacity(value: unknown, label: string) {
  const n = typeof value === "number" ? value : Number(sanitizeEventText(value));
  if (!Number.isFinite(n)) throw new AppError(`Please enter a valid ${label}.`, 400);
  return Math.trunc(n);
}

export function buildEventWriteData(input: EventInput, createdById?: string) {
  const title = requiredText(input.title, "Event title");
  const description = requiredText(input.description, "Description");
  const location = requiredText(input.location, "Location");
  const eventDate = parseEventDate(input.eventDate);
  const startTime = parseTimeOfDay(input.startTime, "start time");
  const endTime = parseTimeOfDay(input.endTime, "end time");
  const registrationDeadline = defaultDeadline(eventDate, startTime);
  const checkInOpensAt = defaultCheckInOpensAt(eventDate);
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    throw new AppError("End time must be after start time.", 400);
  }
  const capacity = parseCapacity(input.capacity, "capacity");
  if (capacity < 1) throw new AppError("Capacity must be at least 1.", 400);
  const walkInCapacity = parseCapacity(input.walkInCapacity ?? 10, "walk-in reserve");
  if (walkInCapacity < 0) throw new AppError("Walk-in reserve cannot be negative.", 400);
  advanceRegistrationCapacity(capacity, walkInCapacity);
  return {
    title,
    description,
    speakerName: optionalText(input.speakerName),
    speakerTitle: optionalText(input.speakerTitle),
    speakerOrganization: optionalText(input.speakerOrganization),
    eventDate,
    startTime,
    endTime,
    location,
    capacity,
    walkInCapacity,
    registrationDeadline,
    checkInOpensAt,
    internalNotes: optionalText(input.internalNotes),
    status: input.status ?? "DRAFT",
    createdById,
  };
}

export async function listCoordinatorEvents() {
  return prisma.event.findMany({ orderBy: [{ eventDate: "asc" }, { startTime: "asc" }] });
}

export async function listPublishedUpcomingEvents() {
  return prisma.event.findMany({
    where: {
      status: { in: ["PUBLISHED", "REGISTRATION_CLOSED"] },
      eventDate: { gte: parseDateOnly(new Date().toISOString().slice(0, 10)) },
    },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
    include: {
      registrations: {
        where: { status: { in: ["REGISTERED", "WAITLISTED"] } },
        select: { memberId: true, status: true, type: true },
      },
    },
  });
}

export async function getEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        include: { member: true, checkedInBy: { select: { name: true } } },
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}

async function announcePublishedSafe(eventId: string) {
  try {
    await announcePublished(eventId);
  } catch (error) {
    logSafe("event.publish_announce_failed", { eventId });
    logServerError("announcePublished", error);
  }
}

export async function createEvent(actor: SessionUser, input: EventInput) {
  const event = await prisma.event.create({ data: buildEventWriteData(input, actor.id) });
  logSafe("event.created", { eventId: event.id, status: event.status });
  if (event.status === "PUBLISHED") await announcePublishedSafe(event.id);
  return event;
}

export async function updateEvent(actor: SessionUser, id: string, input: EventInput) {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new AppError("Event not found.", 404);
  const event = await prisma.event.update({ where: { id }, data: buildEventWriteData(input, existing.createdById ?? actor.id) });
  if (existing.status !== "PUBLISHED" && event.status === "PUBLISHED") {
    await announcePublishedSafe(event.id);
  }
  logSafe("event.updated", { eventId: event.id, status: event.status });
  return event;
}

export async function setEventStatus(id: string, status: EventStatus) {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new AppError("Event not found.", 404);
  if (status === "COMPLETED") {
    await prisma.eventRegistration.updateMany({
      where: { eventId: id, status: "REGISTERED", checkInStatus: "REGISTERED" },
      data: { checkInStatus: "NO_SHOW" },
    });
  }
  const event = await prisma.event.update({ where: { id }, data: { status } });
  if (existing.status !== "PUBLISHED" && status === "PUBLISHED") await announcePublished(id);
  logSafe("event.status", { eventId: id, status });
  return event;
}

async function announcePublished(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return;
  const members = await prisma.user.findMany({ where: { role: "MEMBER", active: true } });
  await Promise.all(
    members.map((user) =>
      notifyUser({
        userId: user.id,
        title: "New event published",
        message: `${event.title} is open for registration.`,
        href: "/home",
        email: {
          to: user.email,
          subject: `IYCM: ${event.title}`,
          text: `${event.title} is now open. Sign in to register.`,
        },
      }),
    ),
  );
}

export async function sendEventReminder(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      registrations: {
        where: { status: "REGISTERED" },
        include: { member: true, user: true },
      },
    },
  });
  if (!event || event.status === "CANCELLED") throw new AppError("Event is not available.", 400);
  for (const row of event.registrations) {
    const userId = row.userId ?? (await prisma.user.findUnique({ where: { email: row.member.email } }))?.id;
    if (!userId) continue;
    await notifyUser({
      userId,
      title: "Event reminder",
      message: `${event.title} is coming up. We look forward to seeing you.`,
      href: "/my-events",
      email: {
        to: row.member.email,
        subject: `Reminder: ${event.title}`,
        text: `This is a reminder for ${event.title}.`,
      },
    });
  }
  logSafe("event.reminder", { eventId, count: event.registrations.length });
}

export function memberFacingStatus(event: {
  status: EventStatus;
  registrationDeadline: Date;
  advanceCapacity: number;
  advanceRegisteredCount: number;
  myStatus?: string | null;
}) {
  if (event.myStatus === "REGISTERED") return "Registered";
  if (event.myStatus === "WAITLISTED") return "Waitlisted";
  if (event.status === "CANCELLED") return "Cancelled";
  if (event.status === "COMPLETED" || event.status === "REGISTRATION_CLOSED") return "Registration Closed";
  if (new Date() > event.registrationDeadline) return "Registration Closed";
  if (event.advanceRegisteredCount >= event.advanceCapacity) return "Spots Full";
  return "Register";
}
