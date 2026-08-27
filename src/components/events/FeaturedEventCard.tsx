import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatEventLongDate, formatTime12h } from "@/lib/dates";
import { advanceRegistrationCapacity } from "@/lib/capacity";
import { eventStatusLabel, eventTitleParts } from "@/utils/format";
import type { Event } from "@prisma/client";

export function FeaturedEventCard({
  event,
  registeredCount,
}: {
  event: Event;
  registeredCount?: number;
}) {
  const { heading, subtitle } = eventTitleParts(event.title);
  const advance = advanceRegistrationCapacity(event.capacity, event.walkInCapacity);

  return (
    <section className="rounded-2xl border-2 border-teal-700 bg-white p-8 shadow-lg sm:p-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-800">Upcoming Event</p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{heading}</h2>
      {subtitle ? <p className="mt-2 text-lg text-slate-700 sm:text-xl">{subtitle}</p> : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-2 text-base text-slate-800 sm:text-lg">
          <p>{formatEventLongDate(event.eventDate)}</p>
          <p>
            {formatTime12h(event.startTime)} – {formatTime12h(event.endTime)}
          </p>
          <p className="whitespace-pre-line pt-2">{event.location}</p>
        </div>
        <div className="space-y-1 text-base text-slate-800 sm:text-lg">
          {event.speakerName ? <p className="font-semibold">{event.speakerName}</p> : null}
          {event.speakerTitle ? <p>{event.speakerTitle}</p> : null}
          {event.speakerOrganization ? <p>{event.speakerOrganization}</p> : null}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Badge tone={event.status === "PUBLISHED" ? "teal" : "slate"}>{eventStatusLabel(event.status)}</Badge>
          <p className="text-sm text-slate-600">
            {typeof registeredCount === "number" ? `${registeredCount} registered · ` : null}
            Capacity {event.capacity}
            {` · ${advance} advance / ${event.walkInCapacity} walk-in`}
          </p>
        </div>
        <Link href={`/events/${event.id}`}>
          <Button className="px-6 py-3 text-base">Open Event</Button>
        </Link>
      </div>
    </section>
  );
}
