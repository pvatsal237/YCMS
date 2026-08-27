import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatEventLongDate, formatTime12h } from "@/lib/dates";
import { eventStatusLabel } from "@/utils/format";
import type { Event } from "@prisma/client";

export function EventListCard({ event }: { event: Event }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{event.title}</h2>
        <Badge tone={event.status === "PUBLISHED" ? "teal" : "slate"}>{eventStatusLabel(event.status)}</Badge>
      </div>
      <dl className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Date</dt>
          <dd>{formatEventLongDate(event.eventDate)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Time</dt>
          <dd>
            {formatTime12h(event.startTime)} – {formatTime12h(event.endTime)}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Location</dt>
          <dd className="whitespace-pre-line">{event.location}</dd>
        </div>
        {event.speakerName ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Speaker</dt>
            <dd>
              <p className="font-medium text-slate-800">{event.speakerName}</p>
              {event.speakerTitle ? <p>{event.speakerTitle}</p> : null}
              {event.speakerOrganization ? <p>{event.speakerOrganization}</p> : null}
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-5">
        <Link href={`/events/${event.id}`}>
          <Button size="sm" variant="secondary">
            Open Event
          </Button>
        </Link>
      </div>
    </section>
  );
}
