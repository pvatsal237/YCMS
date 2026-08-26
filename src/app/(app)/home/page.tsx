import { requireMemberSession } from "@/lib/session";
import { listPublishedUpcomingEvents, memberFacingStatus } from "@/services/events";
import { registerEventAction } from "@/actions/registration";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate, formatTime12h } from "@/lib/dates";

export default async function MemberHomePage() {
  const user = await requireMemberSession();
  const events = await listPublishedUpcomingEvents();
  return (
    <div className="space-y-6">
      <PageHeader title="Upcoming events" description="Register when a spot is open, or join the waitlist if it is full. Capacity numbers stay with coordinators." />
      {events.length === 0 ? <p className="text-sm text-slate-500">No published events right now.</p> : null}
      {events.map((event) => {
        const mine = event.registrations.find((row) => row.memberId === user.memberId);
        const registeredCount = event.registrations.filter((row) => row.status === "REGISTERED").length;
        const label = memberFacingStatus({
          status: event.status,
          registrationDeadline: event.registrationDeadline,
          capacity: event.capacity,
          registeredCount,
          myStatus: mine?.status,
        });
        return (
          <Card key={event.id}>
            <CardBody className="space-y-2">
              <p className="font-medium text-slate-900">{event.title}</p>
              <p className="text-sm text-slate-500">
                {formatDate(event.eventDate)} · {formatTime12h(event.startTime)}–{formatTime12h(event.endTime)} · {event.location}
              </p>
              <p className="text-sm text-slate-700">{event.description}</p>
              {event.speakerName ? <p className="text-sm">Speaker: {event.speakerName}{event.speakerTitle ? `, ${event.speakerTitle}` : ""}</p> : null}
              {label === "Register" || label === "Spots Full" ? (
                <form action={registerEventAction}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <Button type="submit" size="sm">{label === "Spots Full" ? "Join Waitlist" : "Register"}</Button>
                </form>
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
