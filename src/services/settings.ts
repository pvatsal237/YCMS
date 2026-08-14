import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import type { SessionUser } from "@/types";
import type { Prisma } from "@prisma/client";

const DEFAULTS: Record<string, string> = {
  organizationName: "Youth Community Management System",
  defaultMeetupLocation: "Community Centre — Main Hall",
};

export async function getSettings() {
  const rows = await prisma.systemSetting.findMany();
  const map = { ...DEFAULTS };
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

export async function saveSettings(
  values: { organizationName: string; defaultMeetupLocation: string },
  actor: SessionUser,
) {
  await prisma.$transaction([
    prisma.systemSetting.upsert({
      where: { key: "organizationName" },
      update: { value: values.organizationName },
      create: { key: "organizationName", value: values.organizationName },
    }),
    prisma.systemSetting.upsert({
      where: { key: "defaultMeetupLocation" },
      update: { value: values.defaultMeetupLocation },
      create: {
        key: "defaultMeetupLocation",
        value: values.defaultMeetupLocation,
      },
    }),
  ]);
  await logActivity({
    userId: actor.id,
    action: "SETTINGS_UPDATED",
    entityType: "SystemSetting",
    message: `${actor.name} updated system settings`,
  });
}

export async function listActivityLogs(filters: {
  q?: string;
  action?: string;
  page?: number;
}) {
  const page = Math.max(1, filters.page ?? 1);
  const take = 30;
  const where: Prisma.ActivityLogWhereInput = {};
  if (filters.action) where.action = filters.action;
  if (filters.q) {
    where.OR = [
      { message: { contains: filters.q, mode: "insensitive" } },
      { action: { contains: filters.q, mode: "insensitive" } },
      { user: { is: { name: { contains: filters.q, mode: "insensitive" } } } },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * take,
      take,
    }),
  ]);

  const actions = await prisma.activityLog.findMany({
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  });

  return {
    logs,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / take)),
    actions: actions.map((item) => item.action),
  };
}
