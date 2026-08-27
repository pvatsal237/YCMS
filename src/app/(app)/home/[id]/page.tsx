import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMemberSession } from "@/lib/session";
import { getEvent, memberFacingStatus } from "@/services/events";
import { advanceRegistrationCapacity } from "@/lib/capacity";
import { MemberUpcomingEventCard } from "@/components/events/MemberUpcomingEventCard";
import { PageHeader } from "@/components/ui/Feedback";

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
      <PageHeader title="Event details" />
      <MemberUpcomingEventCard event={event} href={`/home/${event.id}`} actionLabel={label} featured />
      <Link href="/home" className="inline-block text-sm font-medium text-teal-800">
        Back to upcoming events
      </Link>
    </div>
  );
}
