import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function notifyUser(input: {
  userId: string;
  title: string;
  body: string;
  href?: string;
  email?: { to: string; subject: string; text: string };
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      href: input.href,
    },
  });
  if (input.email) {
    await sendEmail(input.email);
  }
}

export async function notifyMany(
  users: Array<{ id: string; email: string }>,
  payload: { title: string; body: string; href?: string; subject: string; text: string },
) {
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      title: payload.title,
      body: payload.body,
      href: payload.href,
    })),
  });
  for (const user of users) {
    await sendEmail({ to: user.email, subject: payload.subject, text: payload.text });
  }
}

export async function unreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
