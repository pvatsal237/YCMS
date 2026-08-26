import { requireMemberSession } from "@/lib/session";
import { listPublishedUpcomingEvents, memberFacingStatus } from "@/services/events";
import { advanceRegistrationCapacity } from "@/lib/capacity";
import { RegisterEventForm } from "@/components/events/RegisterEventForm";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate, formatTime12h } from "@/lib/dates";
import Link from "next/link";

export default async function MemberHomePage() {
  const user = await requireMemberSession();
  const events = await listPublishedUpcomingEvents();
  return (
    <div className="space-y-6">
      <PageHeader title="Upcoming events" description="Register when a spot is open, or join the waitlist if it is full. Capacity numbers stay with coordinators." />
      {events.length === 0 ? <p className="text-sm text-slate-500">No published events right now.</p> : null}
      {events.map((event) => {
        const mine = event.registrations.find((row) => row.memberId === user.memberId);
        const advanceRegisteredCount = event.registrations.filter(
          (row) => row.status === "REGISTERED" && row.type === "STANDARD",
        ).length;
        const label = memberFacingStatus({
          status: event.status,
          registrationDeadline: event.registrationDeadline,
          advanceCapacity: advanceRegistrationCapacity(event.capacity, event.walkInCapacity),
          advanceRegisteredCount,
          myStatus: mine?.status,
        });
        return (
          <Card key={event.id}>
            <CardBody className="space-y-2">
              <Link href={`/home/${event.id}`} className="font-medium text-teal-800">
                {event.title}
              </Link>
              <p className="text-sm text-slate-500">
                {formatDate(event.eventDate)} · {formatTime12h(event.startTime)}–{formatTime12h(event.endTime)} · {event.location}
              </p>
              <p className="text-sm text-slate-700">{event.description}</p>
              {event.speakerName ? <p className="text-sm">Speaker: {event.speakerName}{event.speakerTitle ? `, ${event.speakerTitle}` : ""}</p> : null}
              {label === "Register" || label === "Spots Full" ? (
                <RegisterEventForm eventId={event.id} label={label} />
              ) : (
                <p className="text-sm font-medium text-teal-800">{label}</p>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
