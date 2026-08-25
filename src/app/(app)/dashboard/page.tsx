import Link from "next/link";
import { requireCoordinator } from "@/lib/session";
import { coordinatorDashboard } from "@/services/dashboard";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { eventTimeLabel } from "@/services/events";
import { eventStatusLabel } from "@/utils/format";

export default async function DashboardPage() {
  await requireCoordinator();
  const { next, counts, guidance } = await coordinatorDashboard();

  return (
    <div>
      <PageHeader title="Dashboard" description="Upcoming meetup and what needs attention." />
      {next && counts ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Upcoming Event</p>
              <h2 className="mt-1 text-2xl font-semibold text-stone-900">{next.title}</h2>
              <p className="text-stone-600">{eventTimeLabel(next)}</p>
              <p className="text-sm text-stone-500">{next.location}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
              <Stat label="Registered" value={`${counts.registered} / ${next.capacity}`} />
              <Stat label="Status" value={eventStatusLabel(next.status)} />
              <Stat label="Checked in" value={String(counts.checkedIn)} />
              <Stat label="Walk-in remaining" value={String(Math.max(0, next.walkInCapacity - counts.walkIns))} />
              <Stat label="Guidance new" value={String(guidance.new)} />
              <Stat label="Guidance claimed" value={String(guidance.claimed)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/events/${next.id}`}><Button>Manage Event</Button></Link>
              <Link href={`/events/${next.id}/check-in`}><Button variant="secondary">Start Check-In</Button></Link>
              <Link href={`/events/${next.id}/registrations`}><Button variant="secondary">View Registrations</Button></Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <p className="text-stone-600">No upcoming events yet.</p>
            <Link href="/events/new" className="mt-3 inline-block"><Button>Create event</Button></Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 px-3 py-2">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="font-medium text-stone-900">{value}</div>
    </div>
  );
}
