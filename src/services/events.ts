import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { formatDate, formatTime12h, parseDateOnly } from "@/lib/dates";
import { notifyMany } from "@/services/notifications";
import { appUrl } from "@/lib/privacy";
import type { EventStatus, Prisma } from "@prisma/client";
import type { SessionUser } from "@/types";

export function nextSundayDate(from = new Date()) {
  const date = new Date(from);
  const day = date.getDay();
  const add = day === 0 ? 7 : 7 - day;
  date.setDate(date.getDate() + add);
  return date;
}

export function defaultDeadline(eventDate: Date, startTime = "09:00") {
  const [h, m] = startTime.split(":").map(Number);
  const start = new Date(eventDate);
  start.setHours(h || 9, m || 0, 0, 0);
  return new Date(start.getTime() - 48 * 60 * 60 * 1000);
}

export function newWalkInToken() {
  return randomBytes(18).toString("hex");
}

export async function listCoordinatorEvents() {
  return prisma.event.findMany({
    orderBy: [{ eventDate: "desc" }, { startTime: "desc" }],
    include: {
      _count: {
        select: {
          registrations: { where: { status: "REGISTERED" } },
          checkIns: { where: { status: "CHECKED_IN" } },
        },
      },
    },
  });
}

export async function listPublishedUpcomingEvents() {
  const today = parseDateOnly(new Date().toISOString().slice(0, 10));
  return prisma.event.findMany({
    where: {
      status: { in: ["PUBLISHED", "REGISTRATION_CLOSED"] },
      eventDate: { gte: today },
    },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
  });
}

export async function getEvent(id: string) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new AppError("Event not found.", 404, "NOT_FOUND");
  return event;
}

export async function eventCounts(eventId: string) {
  const [registered, waitlisted, walkIns, checkedIn] = await Promise.all([
    prisma.eventRegistration.count({ where: { eventId, status: "REGISTERED" } }),
    prisma.eventRegistration.count({ where: { eventId, status: "WAITLISTED" } }),
    prisma.eventRegistration.count({
      where: { eventId, status: "REGISTERED", type: "WALK_IN" },
    }),
    prisma.eventCheckIn.count({ where: { eventId, status: "CHECKED_IN" } }),
  ]);
  return { registered, waitlisted, walkIns, checkedIn };
}

export async function createEvent(
  input: {
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
    registrationDeadline?: string;
    walkInCapacity?: number;
    checkInOpensAt?: string;
  },
  actor: SessionUser,
) {
  const eventDate = parseDateOnly(input.eventDate);
  const deadline = input.registrationDeadline
    ? new Date(input.registrationDeadline)
    : defaultDeadline(eventDate, input.startTime);
  return prisma.event.create({
    data: {
      title: input.title,
      description: input.description,
      speakerName: input.speakerName || null,
      speakerTitle: input.speakerTitle || null,
      speakerOrganization: input.speakerOrganization || null,
      eventDate,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      capacity: input.capacity,
      registrationDeadline: deadline,
      walkInCapacity: input.walkInCapacity ?? 10,
      checkInOpensAt: input.checkInOpensAt || "08:00",
      walkInToken: newWalkInToken(),
      createdById: actor.id,
      status: "DRAFT",
    },
  });
}

export async function updateEvent(
  id: string,
  input: Prisma.EventUncheckedUpdateInput,
) {
  return prisma.event.update({ where: { id }, data: input });
}

export async function publishEvent(id: string) {
  const event = await prisma.event.update({
    where: { id },
    data: { status: "PUBLISHED" },
  });
  const members = await prisma.user.findMany({
    where: { role: "MEMBER", active: true },
    select: { id: true, email: true },
  });
  const when = `${formatDate(event.eventDate)} ${formatTime12h(event.startTime)}–${formatTime12h(event.endTime)}`;
  const text = [
    "A new community meetup has been announced.",
    "",
    event.title,
    "",
    when,
    event.location,
    "",
    event.description,
    "",
    "Sign in to your Member Portal to register.",
    appUrl("/portal"),
  ].join("\n");
  await notifyMany(members, {
    title: "New International Youth Community Meetup",
    body: `${event.title} · ${when}`,
    href: "/portal",
    subject: "New International Youth Community Meetup",
    text,
  });
  return event;
}

export async function setEventStatus(id: string, status: EventStatus) {
  const event = await prisma.event.update({ where: { id }, data: { status } });
  if (status === "COMPLETED") {
    const registered = await prisma.eventRegistration.findMany({
      where: { eventId: id, status: "REGISTERED" },
      select: { memberId: true },
    });
    const checked = await prisma.eventCheckIn.findMany({
      where: { eventId: id },
      select: { memberId: true },
    });
    const checkedIds = new Set(checked.map((row) => row.memberId));
    const missing = registered.filter((row) => !checkedIds.has(row.memberId));
    if (missing.length) {
      await prisma.eventCheckIn.createMany({
        data: missing.map((row) => ({
          eventId: id,
          memberId: row.memberId,
          status: "NO_SHOW",
        })),
        skipDuplicates: true,
      });
    }
  }
  return event;
}

export function eventTimeLabel(event: { eventDate: Date; startTime: string; endTime: string }) {
  return `${formatDate(event.eventDate)} · ${formatTime12h(event.startTime)}–${formatTime12h(event.endTime)}`;
}
