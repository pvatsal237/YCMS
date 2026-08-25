import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/dates";
import { eventCounts } from "@/services/events";

export async function coordinatorDashboard() {
  const today = parseDateOnly(new Date().toISOString().slice(0, 10));
  const upcoming = await prisma.event.findMany({
    where: {
      status: { in: ["PUBLISHED", "REGISTRATION_CLOSED", "DRAFT"] },
      eventDate: { gte: today },
    },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
    take: 1,
  });
  const next = upcoming[0] ?? null;
  const counts = next ? await eventCounts(next.id) : null;
  const guidance = {
    new: await prisma.guidanceRequest.count({ where: { status: "NEW" } }),
    claimed: await prisma.guidanceRequest.count({ where: { status: "CLAIMED" } }),
    waiting: await prisma.guidanceRequest.count({ where: { status: "WAITING_FOR_MEMBER" } }),
  };
  return { next, counts, guidance };
}

export async function memberUpcomingRegistrations(memberId: string) {
  const today = parseDateOnly(new Date().toISOString().slice(0, 10));
  return prisma.eventRegistration.findMany({
    where: {
      memberId,
      status: { in: ["REGISTERED", "WAITLISTED"] },
      event: { eventDate: { gte: today }, status: { not: "CANCELLED" } },
    },
    include: { event: true },
    orderBy: { event: { eventDate: "asc" } },
  });
}

export async function memberPastRegistrations(memberId: string) {
  const today = parseDateOnly(new Date().toISOString().slice(0, 10));
  return prisma.eventRegistration.findMany({
    where: {
      memberId,
      status: { not: "CANCELLED" },
      event: { eventDate: { lt: today } },
    },
    include: { event: true },
    orderBy: { event: { eventDate: "desc" } },
  });
}
