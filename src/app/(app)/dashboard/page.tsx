import { requireCoordinator } from "@/lib/session";
import { dashboardStats } from "@/services/reports";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate } from "@/lib/dates";
import Link from "next/link";

export default async function DashboardPage() {
  await requireCoordinator();
  const stats = await dashboardStats();
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="A simple snapshot of IYCM activity." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardBody><p className="text-sm text-slate-500">Active members</p><p className="mt-2 text-3xl font-semibold">{stats.members}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-slate-500">Published events</p><p className="mt-2 text-3xl font-semibold">{stats.published}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-slate-500">Unclaimed guidance</p><p className="mt-2 text-3xl font-semibold">{stats.openGuidance}</p></CardBody></Card>
      </div>
      <Card>
        <CardBody className="space-y-2 text-sm">
          <p className="font-medium text-slate-900">Upcoming events</p>
          {stats.upcoming.length === 0 ? <p className="text-slate-500">No upcoming published events.</p> : stats.upcoming.map((event) => (
            <p key={event.id}>
              <Link href={`/events/${event.id}`} className="font-medium text-teal-800">{event.title}</Link>
              {" · "}{formatDate(event.eventDate)}
            </p>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
