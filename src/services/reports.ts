import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/dates";

export async function eventReport(eventId: string) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId },
    include: { member: true },
    orderBy: [{ member: { lastName: "asc" } }, { member: { firstName: "asc" } }],
  });
  const checkIns = await prisma.eventCheckIn.findMany({ where: { eventId } });
  const checkByMember = new Map(checkIns.map((row) => [row.memberId, row]));
  const registered = registrations.filter((row) => row.status === "REGISTERED");
  const waitlisted = registrations.filter((row) => row.status === "WAITLISTED");
  const walkIns = registered.filter((row) => row.type === "WALK_IN");
  const checkedIn = checkIns.filter((row) => row.status === "CHECKED_IN");
  const noShows = checkIns.filter((row) => row.status === "NO_SHOW");
  const participants = registered.map((row) => {
    const check = checkByMember.get(row.memberId);
    return {
      name: `${row.member.firstName} ${row.member.lastName}`.trim(),
      email: row.member.email,
      registered: true,
      type: row.type,
      checkedIn: check?.status === "CHECKED_IN",
      checkInTime: check?.status === "CHECKED_IN" ? check.checkedInAt : null,
      noShow: check?.status === "NO_SHOW",
    };
  });
  return {
    event,
    counts: {
      registered: registered.length,
      checkedIn: checkedIn.length,
      noShows: noShows.length,
      walkIns: walkIns.length,
      waitlisted: waitlisted.length,
    },
    participants,
  };
}

export async function memberHistory(memberId: string) {
  const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
  const registrations = await prisma.eventRegistration.findMany({
    where: { memberId, status: { in: ["REGISTERED", "CANCELLED"] } },
    include: { event: true },
    orderBy: { event: { eventDate: "desc" } },
  });
  const checkIns = await prisma.eventCheckIn.findMany({ where: { memberId } });
  const byEvent = new Map(checkIns.map((row) => [row.eventId, row]));
  return {
    member,
    history: registrations.map((row) => {
      const check = byEvent.get(row.eventId);
      let outcome = "Registered";
      if (check?.status === "CHECKED_IN") outcome = "Checked In";
      else if (check?.status === "NO_SHOW") outcome = "No Show";
      else if (row.status === "CANCELLED") outcome = "Cancelled";
      return { event: row.event, outcome, check };
    }),
  };
}

export function dateRangeForPreset(preset: string) {
  const now = new Date();
  if (preset === "today") {
    const start = parseDateOnly(now.toISOString().slice(0, 10));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }
  if (preset === "month") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { start, end };
  }
  if (preset === "quarter") {
    const q = Math.floor(now.getUTCMonth() / 3) * 3;
    const start = new Date(Date.UTC(now.getUTCFullYear(), q, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), q + 3, 1));
    return { start, end };
  }
  return {};
}

export async function guidanceReport(filters: {
  from?: Date;
  to?: Date;
  category?: string;
  status?: string;
  coordinatorId?: string;
}) {
  const where = {
    createdAt: { gte: filters.from, lte: filters.to },
    category: filters.category as never,
    status: filters.status as never,
    assignedToId: filters.coordinatorId || undefined,
  };
  const rows = await prisma.guidanceRequest.findMany({
    where,
    include: {
      member: true,
      assignedTo: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const counts = {
    received: rows.length,
    unclaimed: rows.filter((row) => row.status === "NEW").length,
    claimed: rows.filter((row) => row.status === "CLAIMED").length,
    waiting: rows.filter((row) => row.status === "WAITING_FOR_MEMBER").length,
    resolved: rows.filter((row) => row.status === "RESOLVED").length,
  };
  return { rows, counts };
}

export async function eventFeedbackSummary(eventId: string) {
  const rows = await prisma.eventFeedback.findMany({ where: { eventId } });
  if (rows.length === 0) return { count: 0, average: null, comments: [] as typeof rows };
  const average = rows.reduce((sum, row) => sum + row.rating, 0) / rows.length;
  return { count: rows.length, average, comments: rows.filter((row) => row.comment) };
}
