import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/dates";
import { getAlertPresentation } from "@/utils/immigration-alerts";
import { toCsv } from "@/utils/csv";
import { fullName, immigrationStatusLabel } from "@/utils/format";

export async function getAttendanceReport(from?: string, to?: string) {
  const meetups = await prisma.meetup.findMany({
    where: {
      meetupDate: {
        gte: from ? parseDateOnly(from) : undefined,
        lte: to ? parseDateOnly(to) : undefined,
      },
    },
    include: { attendance: true },
    orderBy: { meetupDate: "asc" },
  });

  const meetupCount = meetups.length;
  const percentages = meetups.map((meetup) => {
    const recorded = meetup.attendance.length || 1;
    const present = meetup.attendance.filter((row) => row.status === "PRESENT").length;
    return (present / recorded) * 100;
  });
  const averageAttendance =
    percentages.length === 0
      ? 0
      : Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length);

  const members = await prisma.member.findMany({
    where: { active: true },
    include: {
      attendance: {
        where: { meetupId: { in: meetups.map((item) => item.id) } },
        include: { meetup: true },
      },
    },
  });

  const memberRows = members.map((member) => {
    const recorded = member.attendance.length;
    const present = member.attendance.filter((row) => row.status === "PRESENT").length;
    const absent = member.attendance.filter((row) => row.status === "ABSENT").length;
    return {
      id: member.id,
      name: fullName(member),
      recorded,
      present,
      absent,
      percent: recorded === 0 ? 0 : Math.round((present / recorded) * 100),
    };
  });

  const frequentlyAbsent = memberRows
    .filter((row) => row.absent >= 3)
    .sort((a, b) => b.absent - a.absent);

  return {
    meetupCount,
    averageAttendance,
    memberRows: memberRows.sort((a, b) => a.name.localeCompare(b.name)),
    frequentlyAbsent,
    meetups: meetups.map((meetup) => ({
      id: meetup.id,
      date: meetup.meetupDate,
      title: meetup.title,
      present: meetup.attendance.filter((row) => row.status === "PRESENT").length,
      absent: meetup.attendance.filter((row) => row.status === "ABSENT").length,
    })),
  };
}

export async function getMemberReport() {
  const [total, active, byStatus, members] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { active: true } }),
    prisma.memberImmigrationStatus.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.member.findMany({
      select: { dateJoined: true },
    }),
  ]);

  const byMonthMap = new Map<string, number>();
  for (const member of members) {
    const key = member.dateJoined.toISOString().slice(0, 7);
    byMonthMap.set(key, (byMonthMap.get(key) ?? 0) + 1);
  }
  const newMembersByMonth = [...byMonthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  return {
    total,
    active,
    inactive: total - active,
    immigrationDistribution: byStatus.map((row) => ({
      status: row.status,
      label: immigrationStatusLabel(row.status),
      count: row._count.status,
    })),
    newMembersByMonth,
  };
}

export async function getImmigrationExpiryReport() {
  const documents = await prisma.immigrationDocument.findMany({
    include: {
      member: {
        select: { id: true, firstName: true, lastName: true, active: true },
      },
    },
  });

  const buckets = {
    within3: 0,
    within6: 0,
    within12: 0,
    expired: 0,
    valid: 0,
  };

  for (const doc of documents) {
    const alert = getAlertPresentation(doc.expiryDate);
    if (alert.level === "EXPIRED") buckets.expired += 1;
    else if (alert.level === "EXPIRING_3_MONTHS") buckets.within3 += 1;
    else if (alert.level === "EXPIRING_6_MONTHS") buckets.within6 += 1;
    else if (alert.level === "EXPIRING_12_MONTHS") buckets.within12 += 1;
    else buckets.valid += 1;
  }

  return { buckets, total: documents.length };
}

export async function exportAttendanceCsv(from?: string, to?: string) {
  const report = await getAttendanceReport(from, to);
  return toCsv(
    ["Member", "Recorded", "Present", "Absent", "Attendance %"],
    report.memberRows.map((row) => [
      row.name,
      row.recorded,
      row.present,
      row.absent,
      row.percent,
    ]),
  );
}

export async function exportMembersCsv() {
  const members = await prisma.member.findMany({
    include: { immigrationStatus: true, employment: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return toCsv(
    ["Name", "Email", "Phone", "Status", "Immigration", "Employer", "Date Joined", "Active"],
    members.map((member) => [
      fullName(member),
      member.email,
      member.phone,
      member.active ? "Active" : "Inactive",
      member.immigrationStatus
        ? immigrationStatusLabel(member.immigrationStatus.status)
        : "",
      member.employment?.employer ?? "",
      member.dateJoined.toISOString().slice(0, 10),
      member.active ? "Yes" : "No",
    ]),
  );
}

export async function exportImmigrationCsv() {
  const documents = await prisma.immigrationDocument.findMany({
    include: {
      member: { include: { immigrationStatus: true } },
    },
  });
  return toCsv(
    ["Member", "Immigration Status", "Document", "Expiry", "Days Remaining", "Alert"],
    documents.map((doc) => {
      const alert = getAlertPresentation(doc.expiryDate);
      return [
        fullName(doc.member),
        doc.member.immigrationStatus
          ? immigrationStatusLabel(doc.member.immigrationStatus.status)
          : "",
        doc.documentType,
        doc.expiryDate.toISOString().slice(0, 10),
        alert.daysRemaining,
        alert.label,
      ];
    }),
  );
}
