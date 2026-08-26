import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { formatEventLongDate, formatTime12h } from "@/lib/dates";
import { eventStatusLabel } from "@/utils/format";
import type { Event } from "@prisma/client";

export function EventListCard({ event }: { event: Event }) {
  const speakerLines = [event.speakerName, event.speakerTitle, event.speakerOrganization].filter(Boolean);

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">
            {event.title}
          </h2>
          <p className="text-sm text-slate-700">{formatEventLongDate(event.eventDate)}</p>
          <p className="text-sm text-slate-700">
            {formatTime12h(event.startTime)} – {formatTime12h(event.endTime)}
          </p>
          <p className="whitespace-pre-line text-sm text-slate-700">{event.location}</p>
        </div>
        {speakerLines.length > 0 ? (
          <div className="text-sm text-slate-800">
            {speakerLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Badge>{eventStatusLabel(event.status)}</Badge>
          <Link href={`/events/${event.id}`}>
            <Button size="sm">Open Event</Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
