import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export async function listCheckInRoster(eventId: string, query = "") {
  const term = query.trim().toLowerCase();
  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId, status: "REGISTERED" },
    include: {
      member: true,
    },
    orderBy: [{ member: { lastName: "asc" } }, { member: { firstName: "asc" } }],
  });
  const checkIns = await prisma.eventCheckIn.findMany({
    where: { eventId },
  });
  const byMember = new Map(checkIns.map((row) => [row.memberId, row]));
  return registrations
    .filter((row) => {
      if (!term) return true;
      const hay = `${row.member.firstName} ${row.member.lastName} ${row.member.email}`.toLowerCase();
      return hay.includes(term);
    })
    .map((row) => ({
      registration: row,
      member: row.member,
      checkIn: byMember.get(row.member.id) ?? null,
    }));
}

export async function checkInMember(eventId: string, memberId: string, coordinatorId: string) {
  const registration = await prisma.eventRegistration.findUnique({
    where: { eventId_memberId: { eventId, memberId } },
  });
  if (!registration || registration.status !== "REGISTERED") {
    throw new AppError("This member is not registered for the event.");
  }
  const existing = await prisma.eventCheckIn.findUnique({
    where: { eventId_memberId: { eventId, memberId } },
  });
  if (existing?.status === "CHECKED_IN") {
    throw new AppError("This member is already checked in.");
  }
  return prisma.eventCheckIn.upsert({
    where: { eventId_memberId: { eventId, memberId } },
    update: {
      status: "CHECKED_IN",
      checkedInAt: new Date(),
      checkedInById: coordinatorId,
    },
    create: {
      eventId,
      memberId,
      status: "CHECKED_IN",
      checkedInById: coordinatorId,
    },
  });
}
