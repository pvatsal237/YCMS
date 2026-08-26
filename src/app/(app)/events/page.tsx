import Link from "next/link";
import { requireCoordinator } from "@/lib/session";
import { listCoordinatorEvents } from "@/services/events";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { EventListCard } from "@/components/events/EventListCard";
import { startOfUtcDay } from "@/lib/dates";

function isCurrentEvent(event: { eventDate: Date; status: string }, today: Date) {
  if (event.status === "COMPLETED" || event.status === "CANCELLED") return false;
  return startOfUtcDay(event.eventDate).getTime() >= today.getTime();
}

export default async function EventsPage() {
  await requireCoordinator();
  const events = await listCoordinatorEvents();
  const today = startOfUtcDay();
  const current = events.filter((event) => isCurrentEvent(event, today));
  const other = events.filter((event) => !isCurrentEvent(event, today));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Events"
        action={
          <Link href="/events/new">
            <Button size="sm">+ Create Event</Button>
          </Link>
        }
      />
      {events.length === 0 ? (
        <EmptyState title="No events yet" description="Create an event to publish it for members." />
      ) : null}
      <div className="space-y-3">
        {current.map((event) => (
          <EventListCard key={event.id} event={event} />
        ))}
      </div>
      {other.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">Other / Past Events</h2>
          {other.map((event) => (
            <EventListCard key={event.id} event={event} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
