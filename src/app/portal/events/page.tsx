import { requireMemberSession } from "@/lib/session";
import { memberUpcomingRegistrations, memberPastRegistrations } from "@/services/dashboard";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { eventTimeLabel } from "@/services/events";
import { MemberEventActions } from "@/components/events/MemberEventActions";
import { FeedbackForm } from "@/components/events/FeedbackForm";
import { formatDate } from "@/lib/dates";

export default async function MyEventsPage() {
  const user = await requireMemberSession();
  // eslint-disable-next-line react-hooks/purity -- server request timestamp
  const now = Date.now();
  const upcoming = await memberUpcomingRegistrations(user.memberId!);
  const past = await memberPastRegistrations(user.memberId!);
  const checkIns = await prisma.eventCheckIn.findMany({ where: { memberId: user.memberId! } });
  const byEvent = new Map(checkIns.map((row) => [row.eventId, row]));
  const feedback = await prisma.eventFeedback.findMany({ where: { memberId: user.memberId! } });
  const feedbackSet = new Set(feedback.map((row) => row.eventId));

  return (
    <div className="space-y-6">
      <PageHeader title="My Events" />
      <Card>
        <CardHeader title="Upcoming" />
        <CardBody className="space-y-4">
          {upcoming.map((row) => (
            <div key={row.id} className="border-b border-stone-100 pb-3 last:border-0">
              <p className="font-medium">{row.event.title}</p>
              <p className="text-sm text-stone-500">{eventTimeLabel(row.event)} · {row.event.location}</p>
              <MemberEventActions
                eventId={row.eventId}
                status={row.status}
                canRegister={row.event.status === "PUBLISHED"}
                spotsFull={false}
                deadlinePassed={row.event.registrationDeadline.getTime() <= now}
              />
            </div>
          ))}
          {upcoming.length === 0 ? <p className="text-sm text-stone-500">No upcoming registrations.</p> : null}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Past events" />
        <CardBody className="space-y-3">
          {past.map((row) => {
            const check = byEvent.get(row.eventId);
            let outcome = "Registered";
            if (check?.status === "CHECKED_IN") outcome = "Checked In";
            else if (check?.status === "NO_SHOW") outcome = "No Show";
            return (
              <div key={row.id} className="text-sm">
                <p className="font-medium">{row.event.title}</p>
                <p className="text-stone-500">{formatDate(row.event.eventDate)} — {outcome}</p>
                {row.event.status === "COMPLETED" && !feedbackSet.has(row.eventId) ? (
                  <FeedbackForm eventId={row.eventId} />
                ) : null}
              </div>
            );
          })}
          {past.length === 0 ? <p className="text-sm text-stone-500">No past events yet.</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}
