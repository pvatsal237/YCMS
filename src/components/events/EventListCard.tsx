import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { formatEventLongDate, formatTime12h } from "@/lib/dates";
import { cn, eventStatusLabel } from "@/utils/format";
import type { Event } from "@prisma/client";

export function EventListCard({
  event,
  featured = false,
}: {
  event: Event;
  featured?: boolean;
}) {
  return (
    <Card className={cn(featured && "border-teal-200 bg-gradient-to-br from-white to-teal-50 shadow-md")}>
      <CardBody className={cn(featured ? "space-y-6 p-8 sm:p-10" : "space-y-3 p-5")}>
        {featured ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800">Upcoming published event</p>
        ) : null}
        <div className={cn("space-y-2", featured && "space-y-3")}>
          <h2 className={cn("font-semibold text-slate-900", featured ? "text-2xl sm:text-3xl leading-tight" : "text-base")}>
            {event.title}
          </h2>
          <p className={cn("text-slate-700", featured ? "text-base" : "text-sm")}>{formatEventLongDate(event.eventDate)}</p>
          <p className={cn("text-slate-700", featured ? "text-base" : "text-sm")}>
            {formatTime12h(event.startTime)} – {formatTime12h(event.endTime)}
          </p>
          <p className={cn("whitespace-pre-line text-slate-700", featured ? "text-base" : "text-sm")}>{event.location}</p>
        </div>
        {event.speakerName || event.speakerTitle || event.speakerOrganization ? (
          <div className={cn("text-slate-800", featured ? "space-y-1 text-base" : "text-sm")}>
            {event.speakerName ? <p className={featured ? "font-medium" : undefined}>{event.speakerName}</p> : null}
            {event.speakerTitle ? <p>{event.speakerTitle}</p> : null}
            {event.speakerOrganization ? <p>{event.speakerOrganization}</p> : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={event.status === "PUBLISHED" ? "teal" : "slate"}>{eventStatusLabel(event.status)}</Badge>
          <Link href={`/events/${event.id}`}>
            <Button size={featured ? "md" : "sm"}>Open Event</Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
