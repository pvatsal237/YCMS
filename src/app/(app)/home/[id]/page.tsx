import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMemberSession } from "@/lib/session";
import { getEvent, memberFacingStatus } from "@/services/events";
import { advanceRegistrationCapacity } from "@/lib/capacity";
import { RegisterEventForm } from "@/components/events/RegisterEventForm";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate, formatTime12h } from "@/lib/dates";

export default async function MemberEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireMemberSession();
  const { id } = await params;
  const event = await getEvent(id);
  if (!event || (event.status !== "PUBLISHED" && event.status !== "REGISTRATION_CLOSED")) {
    notFound();
  }
  const mine = event.registrations.find((row) => row.memberId === user.memberId);
  const advanceRegisteredCount = event.registrations.filter(
    (row) => row.status === "REGISTERED" && row.type === "STANDARD",
  ).length;
  const label = memberFacingStatus({
    status: event.status,
    registrationDeadline: event.registrationDeadline,
    advanceCapacity: advanceRegistrationCapacity(event.capacity, event.walkInCapacity),
    advanceRegisteredCount,
    myStatus: mine?.status,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.title}
        description={`${formatDate(event.eventDate)} · ${formatTime12h(event.startTime)}–${formatTime12h(event.endTime)}`}
      />
      <Card>
        <CardBody className="space-y-3">
          <p className="text-sm text-slate-700 whitespace-pre-line">{event.description}</p>
          <p className="text-sm text-slate-600 whitespace-pre-line">{event.location}</p>
          {event.speakerName ? (
            <p className="text-sm">
              Speaker: {event.speakerName}
              {event.speakerTitle ? `, ${event.speakerTitle}` : ""}
              {event.speakerOrganization ? ` · ${event.speakerOrganization}` : ""}
            </p>
          ) : null}
          {label === "Register" || label === "Spots Full" ? (
            <RegisterEventForm eventId={event.id} label={label} />
          ) : (
            <p className="text-sm font-medium text-teal-800">{label}</p>
          )}
          <Link href="/home" className="inline-block text-sm font-medium text-teal-800">
            Back to upcoming events
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
