import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { eventCounts, eventTimeLabel } from "@/services/events";
import { eventFeedbackSummary } from "@/services/reports";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { eventStatusLabel } from "@/utils/format";
import { publishEventAction, setEventStatusAction, updateEventAction } from "@/actions/events";
import { EventForm } from "@/components/events/EventForm";
import { WalkInQr } from "@/components/events/WalkInQr";
import { toDateInputValue } from "@/lib/dates";
import { appUrl } from "@/lib/privacy";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();
  const counts = await eventCounts(event.id);
  const feedback = await eventFeedbackSummary(event.id);
  const pad = (n: number) => String(n).padStart(2, "0");
  const deadline = event.registrationDeadline;
  const deadlineLocal = `${deadline.getFullYear()}-${pad(deadline.getMonth() + 1)}-${pad(deadline.getDate())}T${pad(deadline.getHours())}:${pad(deadline.getMinutes())}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.title}
        description={`${eventTimeLabel(event)} · ${event.location}`}
        action={<Badge tone="teal">{eventStatusLabel(event.status)}</Badge>}
      />
      <div className="flex flex-wrap gap-2">
        {event.status === "DRAFT" ? (
          <form action={async () => { "use server"; await publishEventAction(event.id); }}>
            <Button type="submit">Publish event</Button>
          </form>
        ) : null}
        {event.status === "PUBLISHED" ? (
          <form action={async () => { "use server"; await setEventStatusAction(event.id, "REGISTRATION_CLOSED"); }}>
            <Button type="submit" variant="secondary">Close registration</Button>
          </form>
        ) : null}
        {event.status !== "COMPLETED" && event.status !== "CANCELLED" ? (
          <form action={async () => { "use server"; await setEventStatusAction(event.id, "COMPLETED"); }}>
            <Button type="submit" variant="secondary">Mark completed</Button>
          </form>
        ) : null}
        {event.status !== "CANCELLED" ? (
          <form action={async () => { "use server"; await setEventStatusAction(event.id, "CANCELLED"); }}>
            <Button type="submit" variant="danger">Cancel event</Button>
          </form>
        ) : null}
        <Link href={`/events/${event.id}/check-in`}><Button variant="secondary">Manage Check-In</Button></Link>
        <Link href={`/events/${event.id}/registrations`}><Button variant="secondary">View registrations</Button></Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-4 text-sm">
        <Card><CardBody>Registered {counts.registered} / {event.capacity}</CardBody></Card>
        <Card><CardBody>Waitlisted {counts.waitlisted}</CardBody></Card>
        <Card><CardBody>Walk-in remaining {Math.max(0, event.walkInCapacity - counts.walkIns)}</CardBody></Card>
        <Card><CardBody>Checked in {counts.checkedIn}</CardBody></Card>
      </div>
      {event.internalNotes ? (
        <Card>
          <CardHeader title="Internal notes" />
          <CardBody><p className="whitespace-pre-wrap text-sm text-stone-700">{event.internalNotes}</p></CardBody>
        </Card>
      ) : null}
      <WalkInQr url={appUrl(`/walk-in/${event.id}?t=${event.walkInToken}`)} />
      {feedback.count > 0 ? (
        <p className="text-sm text-stone-600">Feedback: {feedback.average?.toFixed(1)} / 5 from {feedback.count} members</p>
      ) : null}
      <Card>
        <CardHeader title="Edit event" />
        <CardBody>
          <EventForm
            submitLabel="Save changes"
            action={async (formData) => updateEventAction(event.id, formData)}
            defaults={{
              title: event.title,
              description: event.description,
              speakerName: event.speakerName,
              speakerTitle: event.speakerTitle,
              speakerOrganization: event.speakerOrganization,
              eventDate: toDateInputValue(event.eventDate),
              startTime: event.startTime,
              endTime: event.endTime,
              location: event.location,
              capacity: event.capacity,
              walkInCapacity: event.walkInCapacity,
              checkInOpensAt: event.checkInOpensAt,
              registrationDeadline: deadlineLocal,
              internalNotes: event.internalNotes,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
