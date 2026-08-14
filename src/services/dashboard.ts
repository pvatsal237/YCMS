import { prisma } from "@/lib/prisma";
import { currentMonthRange } from "@/lib/dates";
import { listExpiringSoon } from "@/services/immigration";
import { listOpenAbsenceFollowUps } from "@/services/follow-ups";
import type { UserRole } from "@prisma/client";

export async function getDashboardData(role: UserRole) {
  const { start, end } = currentMonthRange();
  const latestMeetup = await prisma.meetup.findFirst({
    where: { active: true },
    orderBy: { meetupDate: "desc" },
    include: { attendance: true },
  });

  const [
    totalActiveMembers,
    newMembersThisMonth,
    followUpsRequired,
    recentMembers,
    recentMeetups,
  ] = await Promise.all([
    prisma.member.count({ where: { active: true } }),
    prisma.member.count({
      where: { dateJoined: { gte: start, lt: end } },
    }),
    prisma.followUp.count({
      where: { status: { in: ["PENDING", "CONTACTED"] } },
    }),
    prisma.member.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        dateJoined: true,
        immigrationStatus: { select: { status: true } },
      },
    }),
    prisma.meetup.findMany({
      orderBy: { meetupDate: "asc" },
      take: 8,
      include: { attendance: true },
    }),
  ]);

  const present = latestMeetup
    ? latestMeetup.attendance.filter((row) => row.status === "PRESENT").length
    : 0;
  const absent = latestMeetup
    ? latestMeetup.attendance.filter((row) => row.status === "ABSENT").length
    : 0;

  const sensitive = role === "ADMIN" || role === "COORDINATOR";
  const immigrationAlerts = sensitive ? await listExpiringSoon(180, 8) : [];
  const followUps = sensitive ? await listOpenAbsenceFollowUps(8) : [];

  const attendanceTrend = recentMeetups.map((meetup) => {
    const recorded = meetup.attendance.length || 1;
    const presentCount = meetup.attendance.filter((row) => row.status === "PRESENT").length;
    return {
      date: meetup.meetupDate.toISOString().slice(0, 10),
      title: meetup.title,
      present: presentCount,
      percent: Math.round((presentCount / recorded) * 100),
    };
  });

  return {
    stats: {
      totalActiveMembers,
      presentLatest: present,
      absentLatest: absent,
      newMembersThisMonth,
      immigrationExpiringSoon: immigrationAlerts.length,
      followUpsRequired,
    },
    latestMeetup,
    immigrationAlerts,
    followUps,
    recentMembers: sensitive ? recentMembers : [],
    attendanceTrend,
  };
}

export async function getNotificationCounts(role: UserRole) {
  if (role === "ATTENDANCE_VOLUNTEER") {
    return { total: 0, immigration: 0, followUps: 0 };
  }
  const [immigration, followUps] = await Promise.all([
    listExpiringSoon(90, 50),
    prisma.followUp.count({
      where: { status: { in: ["PENDING", "CONTACTED"] } },
    }),
  ]);
  const immigrationCount = immigration.filter(
    (row) => row.level === "EXPIRED" || row.level === "EXPIRING_3_MONTHS",
  ).length;
  return {
    immigration: immigrationCount,
    followUps,
    total: immigrationCount + followUps,
  };
}
