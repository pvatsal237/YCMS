import Link from "next/link";
import { listCoordinatorEvents, eventTimeLabel } from "@/services/events";
import { PageHeader } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { eventStatusLabel } from "@/utils/format";

export default async function EventsPage() {
  const events = await listCoordinatorEvents();
  return (
    <div>
      <PageHeader title="Events" action={<Link href="/events/new"><Button>Create event</Button></Link>} />
      <div className="space-y-3">
        {events.map((event) => (
          <Card key={event.id}>
            <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link href={`/events/${event.id}`} className="font-semibold text-stone-900 hover:underline">
                  {event.title}
                </Link>
                <p className="text-sm text-stone-500">{eventTimeLabel(event)} · {event.location}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-stone-600">{event._count.registrations} registered</span>
                <Badge tone={event.status === "PUBLISHED" ? "teal" : "slate"}>{eventStatusLabel(event.status)}</Badge>
              </div>
            </CardBody>
          </Card>
        ))}
        {events.length === 0 ? <p className="text-sm text-stone-500">No events yet.</p> : null}
      </div>
    </div>
  );
}
