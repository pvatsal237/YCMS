import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatEventLongDate, formatTime12h } from "@/lib/dates";
import { eventStatusLabel } from "@/utils/format";
import type { Event } from "@prisma/client";

export function EventListCard({ event }: { event: Event }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{event.title}</h2>
      <p className="mt-1 text-sm text-slate-600">
        {formatEventLongDate(event.eventDate)} · {formatTime12h(event.startTime)} – {formatTime12h(event.endTime)}
      </p>
      <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{event.location}</p>
      {event.speakerName ? <p className="mt-2 text-sm text-slate-700">{event.speakerName}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={event.status === "PUBLISHED" ? "teal" : "slate"}>{eventStatusLabel(event.status)}</Badge>
        <Link href={`/events/${event.id}`}>
          <Button size="sm" variant="secondary">Open Event</Button>
        </Link>
      </div>
    </section>
  );
}
