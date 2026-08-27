import Link from "next/link";
import { requireCoordinator } from "@/lib/session";
import { featuredPublishedEvent, listCoordinatorEvents } from "@/services/events";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { PageLoadError } from "@/components/ui/PageLoadError";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EventListCard } from "@/components/events/EventListCard";
import { loadPageData } from "@/lib/page-data";
import { startOfUtcDay } from "@/lib/dates";

function isCurrentEvent(event: { eventDate: Date; status: string }, today: Date) {
  if (event.status === "COMPLETED" || event.status === "CANCELLED") return false;
  return startOfUtcDay(event.eventDate).getTime() >= today.getTime();
}

export default async function EventsPage() {
  await requireCoordinator();
  const loaded = await loadPageData("events.page", listCoordinatorEvents);
  if (!loaded.ok) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Events"
          action={
            <Link href="/events/new">
              <Button size="sm">+ Create Event</Button>
            </Link>
          }
        />
        <PageLoadError description="We could not load events. Please try again." />
      </div>
    );
  }

  const events = loaded.data;
  const today = startOfUtcDay();
  const featured = featuredPublishedEvent(events, today);
  const remainingCurrent = events.filter(
    (event) => event.id !== featured?.id && isCurrentEvent(event, today),
  );
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
        <Card>
          <EmptyState title="No events yet" description="Create an event to publish it for members." />
        </Card>
      ) : null}
      {featured ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">Upcoming</h2>
          <EventListCard event={featured} />
        </section>
      ) : null}
      {remainingCurrent.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">Other upcoming events</h2>
          {remainingCurrent.map((event) => (
            <EventListCard key={event.id} event={event} />
          ))}
        </section>
      ) : null}
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
