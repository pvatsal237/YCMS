import Link from "next/link";
import { requireCoordinator } from "@/lib/session";
import { listCoordinatorEvents } from "@/services/events";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, formatTime12h } from "@/lib/dates";
import { eventStatusLabel } from "@/utils/format";
import { EventForm } from "@/components/events/EventForm";
import { advanceRegistrationCapacity } from "@/lib/capacity";

export default async function EventsPage() {
  await requireCoordinator();
  const events = await listCoordinatorEvents();
  return (
    <div className="space-y-6">
      <PageHeader title="Events" description="Create and manage IYCM events. Only published events are visible to members." />
      <Card>
        <CardBody>
          <h2 className="mb-4 text-base font-semibold">New event</h2>
          <EventForm />
        </CardBody>
      </Card>
      <div className="space-y-3">
        {events.map((event) => (
          <Card key={event.id}>
            <CardBody className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{event.title}</p>
                <p className="text-sm text-slate-500">
                  {formatDate(event.eventDate)} · {formatTime12h(event.startTime)}–{formatTime12h(event.endTime)} · {event.location}
                </p>
                <p className="text-sm text-slate-500">
                  Total capacity {event.capacity} · Advance {advanceRegistrationCapacity(event.capacity, event.walkInCapacity)} · Walk-in reserve {event.walkInCapacity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{eventStatusLabel(event.status)}</Badge>
                <Link href={`/events/${event.id}`}><Button size="sm" variant="secondary">Open</Button></Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
