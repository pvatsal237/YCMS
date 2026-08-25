import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { eventReport, guidanceReport, dateRangeForPreset } from "@/services/reports";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatDate } from "@/lib/dates";
import { fullName, guidanceCategoryLabel, guidanceStatusLabel } from "@/utils/format";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; range?: string; category?: string; status?: string; coordinatorId?: string }>;
}) {
  const params = await searchParams;
  const events = await prisma.event.findMany({ orderBy: { eventDate: "desc" }, take: 30 });
  const coordinators = await prisma.user.findMany({ where: { role: "COORDINATOR" }, orderBy: { name: "asc" } });
  const selectedEvent = params.eventId || events[0]?.id;
  const report = selectedEvent ? await eventReport(selectedEvent) : null;
  const range = dateRangeForPreset(params.range || "month");
  const guidance = await guidanceReport({
    from: range.start,
    to: range.end,
    category: params.category,
    status: params.status,
    coordinatorId: params.coordinatorId,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" />
      <Card>
        <CardHeader title="Event report" action={selectedEvent ? <Link className="text-sm text-teal-800" href={`/api/reports/export?type=event&eventId=${selectedEvent}`}>Export CSV</Link> : null} />
        <CardBody className="space-y-3">
          <form className="flex gap-2">
            <select name="eventId" defaultValue={selectedEvent} className="rounded-md border border-stone-300 px-3 py-2 text-sm">
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.title} · {formatDate(event.eventDate)}</option>
              ))}
            </select>
            <button type="submit" className="text-sm text-teal-800">View</button>
          </form>
          {report ? (
            <>
              <p className="text-sm text-stone-600">
                Registered {report.counts.registered} · Checked in {report.counts.checkedIn} · No shows {report.counts.noShows} · Walk-ins {report.counts.walkIns} · Waitlisted {report.counts.waitlisted}
              </p>
              <div className="overflow-x-auto text-sm">
                <table className="min-w-full">
                  <thead className="text-xs uppercase text-stone-500">
                    <tr>
                      <th className="py-2 text-left">Member</th>
                      <th className="py-2 text-left">Type</th>
                      <th className="py-2 text-left">Checked in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.participants.map((row) => (
                      <tr key={row.email} className="border-t border-stone-100">
                        <td className="py-2">{row.name}</td>
                        <td className="py-2">{row.type === "WALK_IN" ? "Walk-In" : "Normal"}</td>
                        <td className="py-2">{row.checkedIn ? "Yes" : row.noShow ? "No Show" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Guidance report" action={<Link className="text-sm text-teal-800" href="/api/reports/export?type=guidance">Export CSV</Link>} />
        <CardBody className="space-y-3">
          <form className="flex flex-wrap gap-2 text-sm">
            <select name="range" defaultValue={params.range || "month"} className="rounded-md border border-stone-300 px-2 py-1">
              <option value="today">Today</option>
              <option value="month">This month</option>
              <option value="quarter">This quarter</option>
            </select>
            <select name="status" defaultValue={params.status || ""} className="rounded-md border border-stone-300 px-2 py-1">
              <option value="">All statuses</option>
              <option value="NEW">New</option>
              <option value="CLAIMED">Claimed</option>
              <option value="WAITING_FOR_MEMBER">Waiting</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            <select name="coordinatorId" defaultValue={params.coordinatorId || ""} className="rounded-md border border-stone-300 px-2 py-1">
              <option value="">All coordinators</option>
              {coordinators.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
            <button type="submit">Filter</button>
          </form>
          <p className="text-sm text-stone-600">
            Received {guidance.counts.received} · Unclaimed {guidance.counts.unclaimed} · Claimed {guidance.counts.claimed} · Waiting {guidance.counts.waiting} · Resolved {guidance.counts.resolved}
          </p>
          {guidance.rows.slice(0, 20).map((row) => (
            <div key={row.id} className="text-sm">
              {fullName(row.member)} · {guidanceCategoryLabel(row.category)} · {guidanceStatusLabel(row.status)}
              {row.assignedTo ? ` · ${row.assignedTo.name}` : ""}
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
