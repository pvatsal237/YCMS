import { requireMemberSession } from "@/lib/session";
import { listPublishedUpcomingEvents, eventCounts, eventTimeLabel } from "@/services/events";
import { memberRegistrationMap } from "@/services/registrations";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { MemberEventActions } from "@/components/events/MemberEventActions";

export default async function PortalHomePage() {
  const user = await requireMemberSession();
  // Snapshot "now" once for deadline comparisons in this request.
  // eslint-disable-next-line react-hooks/purity -- server request timestamp
  const now = Date.now();
  const events = await listPublishedUpcomingEvents();
  const map = await memberRegistrationMap(user.memberId!, events.map((event) => event.id));
  const counts = await Promise.all(events.map((event) => eventCounts(event.id)));

  return (
    <div>
      <PageHeader title="Upcoming Events" description={`Welcome, ${user.name.split(" ")[0]}.`} />
      <div className="space-y-4">
        {events.map((event, index) => {
          const registration = map.get(event.id);
          const registeredCount = counts[index].registered;
          const spotsFull = registeredCount >= event.capacity;
          const deadlinePassed = event.registrationDeadline.getTime() <= now;
          const canRegister = event.status === "PUBLISHED";
          return (
            <Card key={event.id}>
              <CardBody className="space-y-2">
                <h2 className="text-lg font-semibold text-stone-900">{event.title}</h2>
                <p className="text-sm text-stone-600">{eventTimeLabel(event)}</p>
                <p className="text-sm text-stone-500">{event.location}</p>
                <p className="text-sm text-stone-700">{event.description}</p>
                {event.speakerName ? (
                  <p className="text-sm text-stone-500">
                    {event.speakerName}
                    {event.speakerTitle ? `, ${event.speakerTitle}` : ""}
                    {event.speakerOrganization ? ` · ${event.speakerOrganization}` : ""}
                  </p>
                ) : null}
                <MemberEventActions
                  eventId={event.id}
                  status={registration?.status ?? null}
                  canRegister={canRegister}
                  spotsFull={spotsFull}
                  deadlinePassed={deadlinePassed}
                />
              </CardBody>
            </Card>
          );
        })}
        {events.length === 0 ? <p className="text-sm text-stone-500">No upcoming events right now.</p> : null}
      </div>
    </div>
  );
}
