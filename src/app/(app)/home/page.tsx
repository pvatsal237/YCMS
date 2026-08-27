import { requireMemberSession } from "@/lib/session";
import { listPublishedUpcomingEvents, memberFacingStatus } from "@/services/events";
import { advanceRegistrationCapacity } from "@/lib/capacity";
import { MemberUpcomingEventCard } from "@/components/events/MemberUpcomingEventCard";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Card";

export default async function MemberHomePage() {
  const user = await requireMemberSession();
  const events = await listPublishedUpcomingEvents();
  return (
    <div className="space-y-8">
      <PageHeader title="Upcoming events" description="Register when a spot is open, or join the waitlist if it is full." />
      {events.length === 0 ? (
        <Card>
          <EmptyState title="No upcoming events." description="Published events will appear here when they are open for registration." />
        </Card>
      ) : null}
      {events.map((event, index) => {
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
          <MemberUpcomingEventCard
            key={event.id}
            event={event}
            href={`/home/${event.id}`}
            actionLabel={label}
            featured={index === 0}
          />
        );
      })}
    </div>
  );
}
