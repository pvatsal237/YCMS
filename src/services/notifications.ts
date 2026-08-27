import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { logSafe } from "@/lib/log";

export async function countUnreadNotifications(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(userId: string, id: string) {
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function notifyUser(input: {
  userId: string;
  title: string;
  message: string;
  href?: string;
  email?: { to: string; subject: string; text: string };
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      href: input.href,
    },
  });
  logSafe("notification.created", { userId: input.userId, title: input.title });
  if (input.email) {
    await sendEmail(input.email);
  }
}

export async function notifyCoordinators(input: {
  title: string;
  message: string;
  href?: string;
}) {
  const coordinators = await prisma.user.findMany({
    where: { role: "COORDINATOR", active: true },
    select: { id: true, email: true },
  });
  await Promise.all(
    coordinators.map((row) =>
      notifyUser({
        userId: row.id,
        title: input.title,
        message: input.message,
        href: input.href,
      }),
    ),
  );
}
