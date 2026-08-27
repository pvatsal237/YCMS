import { prisma } from "@/lib/prisma";
import { eventReportCsvFilename, toCsv } from "@/utils/csv";
import { formatPhoneDisplay } from "@/services/members";
import { fullName } from "@/utils/format";
import { sortGuidanceRows } from "@/lib/guidance-report";
import type { GuidanceCategory, GuidanceStatus } from "@prisma/client";

export async function eventReport(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      registrations: {
        include: { member: true },
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });
  if (!event) return null;
  const registered = event.registrations.filter((row) => row.status === "REGISTERED");
  return {
    event,
    counts: {
      registered: registered.length,
      checkedIn: registered.filter((row) => row.checkInStatus === "CHECKED_IN").length,
      noShows: registered.filter((row) => row.checkInStatus === "NO_SHOW").length,
      walkIns: registered.filter((row) => row.type === "WALK_IN").length,
      waitlisted: event.registrations.filter((row) => row.status === "WAITLISTED").length,
    },
  };
}

export async function reportsOverview() {
  const [totalCompletedEvents, guidanceRequests, groups] = await Promise.all([
    prisma.event.count({ where: { status: "COMPLETED" } }),
    prisma.guidanceRequest.count(),
    prisma.eventRegistration.groupBy({
      by: ["status", "type", "checkInStatus"],
      _count: { _all: true },
    }),
  ]);
  let totalRegistrations = 0;
  let totalCheckIns = 0;
  let totalNoShows = 0;
  let walkIns = 0;
  for (const row of groups) {
    const count = row._count._all;
    if (row.status !== "REGISTERED") continue;
    totalRegistrations += count;
    if (row.checkInStatus === "CHECKED_IN") totalCheckIns += count;
    if (row.checkInStatus === "NO_SHOW") totalNoShows += count;
    if (row.type === "WALK_IN") walkIns += count;
  }
  return {
    totalCompletedEvents,
    totalRegistrations,
    totalCheckIns,
    totalNoShows,
    walkIns,
    guidanceRequests,
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
  category?: GuidanceCategory | "";
  status?: GuidanceStatus | "";
  coordinatorId?: string;
  event?: string;
}) {
  const where = {
    ...(filters.from || filters.to ? { createdAt: { gte: filters.from, lte: filters.to } } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.coordinatorId ? { claimedById: filters.coordinatorId } : {}),
    ...(filters.event && filters.event !== "all"
      ? { eventId: filters.event === "none" ? null : filters.event }
      : {}),
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

export async function exportGuidanceCsv(
  filters: Parameters<typeof guidanceReport>[0],
  sort: import("@/lib/guidance-report").GuidanceSort = "newest",
) {
  const { rows } = await guidanceReport(filters);
  const sorted = sortGuidanceRows(
    rows.map((row) => ({
      ...row,
      claimedByName: row.claimedBy?.name ?? null,
    })),
    sort,
  );
  const csv = toCsv(
    [
      "Member",
      "Email",
      "Category",
      "Request Date",
      "Event",
      "Status",
      "Handled By",
      "Claimed At",
      "Completed At",
    ],
    sorted.map((row) => [
      fullName(row.member),
      row.member.email,
      row.category,
      row.createdAt.toISOString(),
      row.event?.title ?? "No linked event",
      row.status,
      row.claimedBy?.name ?? "",
      row.claimedAt?.toISOString() ?? "",
      row.resolvedAt?.toISOString() ?? "",
    ]),
  );
  return {
    csv: `\uFEFF${csv}`,
    filename: `iycm-guidance-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

export async function exportEventCsv(eventId: string) {
  const report = await eventReport(eventId);
  if (!report) return null;
  const csv = toCsv(
    [
      "Event Title",
      "Event Date",
      "Member Name",
      "Email",
      "Phone",
      "Registration Type",
      "Registration Status",
      "Check-In Status",
      "Checked-In At",
    ],
    report.event.registrations.map((row) => [
      report.event.title,
      report.event.eventDate.toISOString().slice(0, 10),
      fullName(row.member),
      row.member.email,
      formatPhoneDisplay(row.member.phone),
      row.type,
      row.status,
      row.checkInStatus,
      row.checkedInAt?.toISOString() ?? "",
    ]),
  );
  return {
    csv: `\uFEFF${csv}`,
    filename: eventReportCsvFilename(report.event.title, report.event.eventDate),
  };
}

export async function dashboardStats() {
  const [members, published, openGuidance] = await Promise.all([
    prisma.member.count({ where: { active: true } }),
    prisma.event.count({ where: { status: "PUBLISHED" } }),
    prisma.guidanceRequest.count({ where: { status: "NEW" } }),
  ]);
  return { members, published, openGuidance };
}
