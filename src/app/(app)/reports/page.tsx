import { requireCoordinator } from "@/lib/session";
import { eventReport, guidanceReport } from "@/services/reports";
import { listCoordinatorEvents } from "@/services/events";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { GUIDANCE_LABELS } from "@/utils/format";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; range?: string; category?: string; status?: string; coordinator?: string }>;
}) {
  await requireCoordinator();
  const params = await searchParams;
  const events = await listCoordinatorEvents();
  const eventId = params.eventId ?? events[0]?.id;
  const report = eventId ? await eventReport(eventId) : null;
  const now = new Date();
  const from =
    params.range === "today"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : params.range === "quarter"
        ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        : new Date(now.getFullYear(), now.getMonth(), 1);
  const coordinators = await prisma.user.findMany({ where: { role: "COORDINATOR" }, select: { id: true, name: true } });
  const guidance = await guidanceReport({
    from,
    to: now,
    category: params.category as never,
    status: params.status as never,
    coordinatorId: params.coordinator,
    eventId: params.eventId,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Simple counts for events and guidance." />
      <Card>
        <CardHeader title="Event report" />
        <CardBody className="space-y-3">
          <form className="flex gap-2">
            <select name="eventId" defaultValue={eventId} className="rounded-md border px-3 py-2 text-sm">
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
            <button className="rounded-md border px-3 py-2 text-sm" type="submit">View</button>
            {eventId ? (
              <a className="rounded-md border px-3 py-2 text-sm" href={`/api/reports/export?type=event&eventId=${eventId}`}>
                Export CSV
              </a>
            ) : null}
          </form>
          {report ? (
            <p className="text-sm">
              Registered {report.counts.registered} · Checked in {report.counts.checkedIn} · No shows {report.counts.noShows} · Walk-ins {report.counts.walkIns} · Waitlisted {report.counts.waitlisted}
            </p>
          ) : (
            <p className="text-sm text-slate-500">No event selected.</p>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Guidance report" />
        <CardBody className="space-y-3">
          <form className="flex flex-wrap gap-2">
            <select name="range" defaultValue={params.range ?? "month"} className="rounded-md border px-3 py-2 text-sm">
              <option value="today">Today</option>
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
            </select>
            <select name="category" defaultValue={params.category ?? ""} className="rounded-md border px-3 py-2 text-sm">
              <option value="">All categories</option>
              {Object.entries(GUIDANCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select name="status" defaultValue={params.status ?? ""} className="rounded-md border px-3 py-2 text-sm">
              <option value="">All statuses</option>
              <option value="NEW">New</option>
              <option value="CLAIMED">Claimed</option>
              <option value="WAITING_FOR_MEMBER">Waiting for Member</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            <select name="coordinator" defaultValue={params.coordinator ?? ""} className="rounded-md border px-3 py-2 text-sm">
              <option value="">All coordinators</option>
              {coordinators.map((row) => (
                <option key={row.id} value={row.id}>{row.name}</option>
              ))}
            </select>
            <button className="rounded-md border px-3 py-2 text-sm" type="submit">Filter</button>
          </form>
          <p className="text-sm">
            Total {guidance.counts.total} · New {guidance.counts.new} · Claimed {guidance.counts.claimed} · Waiting {guidance.counts.waiting} · Resolved {guidance.counts.resolved}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
