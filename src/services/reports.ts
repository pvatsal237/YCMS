import { prisma } from "@/lib/prisma";
import { toCsv } from "@/utils/csv";
import { maskPhone } from "@/services/members";
import { fullName } from "@/utils/format";
import type { GuidanceCategory, GuidanceStatus } from "@prisma/client";

export async function eventReport(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { registrations: { include: { member: true } } },
  });
  if (!event) return null;
  const registered = event.registrations.filter((row) => row.status === "REGISTERED");
  return {
    event,
    counts: {
      registered: registered.filter((row) => row.type === "STANDARD").length,
      checkedIn: registered.filter((row) => row.checkInStatus === "CHECKED_IN").length,
      noShows: registered.filter((row) => row.checkInStatus === "NO_SHOW").length,
      walkIns: registered.filter((row) => row.type === "WALK_IN").length,
      waitlisted: event.registrations.filter((row) => row.status === "WAITLISTED").length,
    },
  };
}

export async function memberHistory(memberId: string) {
  const rows = await prisma.eventRegistration.findMany({
    where: { memberId },
    include: { event: true },
    orderBy: { createdAt: "desc" },
  });
  return {
    registered: rows.filter((row) => row.status === "REGISTERED" || row.status === "CANCELLED").length,
    checkedIn: rows.filter((row) => row.checkInStatus === "CHECKED_IN").length,
    noShows: rows.filter((row) => row.checkInStatus === "NO_SHOW").length,
    rows,
  };
}

export async function guidanceReport(filters: {
  from?: Date;
  to?: Date;
  category?: GuidanceCategory;
  status?: GuidanceStatus;
  coordinatorId?: string;
  eventId?: string;
}) {
  const where = {
    ...(filters.from || filters.to ? { createdAt: { gte: filters.from, lte: filters.to } } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.coordinatorId ? { claimedById: filters.coordinatorId } : {}),
    ...(filters.eventId ? { eventId: filters.eventId } : {}),
  };
  const rows = await prisma.guidanceRequest.findMany({
    where,
    include: { member: true, claimedBy: true, event: true },
    orderBy: { createdAt: "desc" },
  });
  const counts = {
    total: rows.length,
    new: rows.filter((row) => row.status === "NEW").length,
    claimed: rows.filter((row) => row.status === "CLAIMED").length,
    waiting: rows.filter((row) => row.status === "WAITING_FOR_MEMBER").length,
    resolved: rows.filter((row) => row.status === "RESOLVED").length,
  };
  return { rows, counts };
}

export async function exportEventCsv(eventId: string) {
  const report = await eventReport(eventId);
  if (!report) return "";
  return toCsv(
    ["Member", "Email", "Phone", "Type", "Registration", "Check-in", "Check-in time"],
    report.event.registrations.map((row) => [
      fullName(row.member),
      row.member.email,
      maskPhone(row.member.phone),
      row.type,
      row.status,
      row.checkInStatus,
      row.checkedInAt?.toISOString() ?? "",
    ]),
  );
}

export async function dashboardStats() {
  const today = new Date();
  const [members, published, openGuidance, upcoming] = await Promise.all([
    prisma.member.count({ where: { active: true } }),
    prisma.event.count({ where: { status: "PUBLISHED" } }),
    prisma.guidanceRequest.count({ where: { status: "NEW" } }),
    prisma.event.findMany({
      where: { status: { in: ["PUBLISHED", "REGISTRATION_CLOSED"] }, eventDate: { gte: today } },
      orderBy: { eventDate: "asc" },
      take: 5,
    }),
  ]);
  return { members, published, openGuidance, upcoming };
}
