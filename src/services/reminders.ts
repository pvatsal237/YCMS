import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/services/notifications";
import { eventTimeLabel } from "@/services/events";
import { appUrl } from "@/lib/privacy";

export async function sendDueEventReminders(now = new Date()) {
  const from = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 28 * 60 * 60 * 1000);
  const events = await prisma.event.findMany({
    where: {
      status: { in: ["PUBLISHED", "REGISTRATION_CLOSED"] },
      reminderSentAt: null,
    },
  });
  let sent = 0;
  for (const event of events) {
    const [h, m] = event.startTime.split(":").map(Number);
    const start = new Date(event.eventDate);
    start.setHours(h || 9, m || 0, 0, 0);
    if (start < from || start > to) continue;
    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId: event.id, status: "REGISTERED" },
      include: { member: { include: { loginUser: true } } },
    });
    const when = eventTimeLabel(event);
    for (const row of registrations) {
      if (!row.member.loginUser) continue;
      await notifyUser({
        userId: row.member.loginUser.id,
        title: "Reminder: your meetup is tomorrow",
        body: `${event.title} · ${when} · ${event.location}`,
        href: "/portal/events",
        email: {
          to: row.member.email,
          subject: "Reminder: Your meetup is tomorrow",
          text: `Reminder: Your meetup is tomorrow.\n\n${event.title}\n${when}\n${event.location}\n\n${appUrl("/portal/events")}`,
        },
      });
      sent += 1;
    }
    await prisma.event.update({
      where: { id: event.id },
      data: { reminderSentAt: now },
    });
  }
  return sent;
}
