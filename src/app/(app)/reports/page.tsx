import Link from "next/link";
import { requireCoordinator } from "@/lib/session";
import { eventReport, guidanceReport, reportsOverview } from "@/services/reports";
import { listCoordinatorEvents } from "@/services/events";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { PageLoadError } from "@/components/ui/PageLoadError";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { loadPageData } from "@/lib/page-data";
import { formatDateTime, formatEventLongDate } from "@/lib/dates";
import { eventStatusLabel, fullName, GUIDANCE_LABELS, guidanceStatusLabel } from "@/utils/format";
import { GuidanceFilterForm } from "@/components/guidance/GuidanceFilterForm";
import {
  buildGuidanceQuery,
  formatDayLabel,
  formatMonthLabel,
  guidanceDateRange,
  groupGuidanceByDay,
  groupGuidanceByEvent,
  groupGuidanceByMonth,
  groupGuidanceByQuarter,
  parseGuidanceReportFilters,
  sortGuidanceRows,
} from "@/lib/guidance-report";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireCoordinator();
  const params = await searchParams;
  const filters = parseGuidanceReportFilters(params);
  const loaded = await loadPageData("reports.page", async () => {
    const { from, to } = guidanceDateRange(filters);
    const [events, overview, coordinators, guidance] = await Promise.all([
      listCoordinatorEvents(),
      reportsOverview(),
      prisma.user.findMany({
        where: { role: "COORDINATOR", active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      guidanceReport({
        from,
        to,
        category: filters.category,
        status: filters.status,
        coordinatorId: filters.coordinatorId,
        event: filters.event,
      }),
    ]);
    const completed = events.filter((event) => event.status === "COMPLETED");
    const other = events.filter((event) => event.status !== "COMPLETED");
    const withCounts = await Promise.all(
      completed.map(async (event) => {
        const report = await eventReport(event.id);
        return { event, counts: report?.counts };
      }),
    );
    return { overview, completed: withCounts, other, events, coordinators, guidance };
  });

  if (!loaded.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" description="Attendance and participation for IYCM events." />
        <PageLoadError description="We could not load reports. Please try again." />
      </div>
    );
  }

  const { overview, completed, other, events, coordinators, guidance } = loaded.data;
  if (overview.totalCompletedEvents === 0 && overview.guidanceRequests === 0 && completed.length === 0 && other.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" description="Attendance and participation for IYCM events." />
        <Card>
          <EmptyState
            title="No reports available yet."
            description="Reports will appear here once event registrations, check-ins, or guidance activity are available."
          />
        </Card>
      </div>
    );
  }

  const stats = [
    { label: "Total Completed Events", value: overview.totalCompletedEvents },
    { label: "Total Registrations", value: overview.totalRegistrations },
    { label: "Total Check-Ins", value: overview.totalCheckIns },
    { label: "Total No Shows", value: overview.totalNoShows },
    { label: "Total Walk-Ins", value: overview.walkIns },
    { label: "Guidance Requests", value: overview.guidanceRequests },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" description="Attendance and participation for IYCM events." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardBody>
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-500">Completed / Historical</h2>
        {completed.length === 0 ? (
          <Card>
            <EmptyState
              title="No completed events yet."
              description="Completed events will appear here with View Report and Export CSV."
            />
          </Card>
        ) : (
          completed.map(({ event, counts }) => (
            <Card key={event.id}>
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{event.title}</h3>
                    <Badge tone="slate">{eventStatusLabel(event.status)}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{formatEventLongDate(event.eventDate)}</p>
                  {counts ? (
                    <p className="text-sm text-slate-500">
                      Registered {counts.registered} · Checked in {counts.checkedIn} · No shows {counts.noShows} · Walk-ins {counts.walkIns}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/reports/${event.id}`}>
                    <Button size="sm">View Report</Button>
                  </Link>
                  <a
                    href={`/api/reports/export?eventId=${event.id}`}
                    className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Export CSV
                  </a>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </section>
      {other.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">Other events</h2>
          {other.map((event) => (
            <Card key={event.id}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{event.title}</p>
                  <p className="text-sm text-slate-500">
                    {formatEventLongDate(event.eventDate)} · {eventStatusLabel(event.status)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/reports/${event.id}`}>
                    <Button size="sm" variant="secondary">
                      View Report
                    </Button>
                  </Link>
                  <a
                    href={`/api/reports/export?eventId=${event.id}`}
                    className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Export CSV
                  </a>
                </div>
              </CardBody>
            </Card>
          ))}
        </section>
      ) : null}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Guidance Reports</h2>
        <GuidanceFilterForm
          action="/reports"
          filters={filters}
          coordinators={coordinators}
          events={events}
          includeSort
          extra={
            <a
              href={`/api/reports/export?${buildGuidanceQuery(filters, { type: "guidance" })}`}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Export Guidance CSV
            </a>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Total Guidance Requests", guidance.counts.total],
            ["New", guidance.counts.new],
            ["Claimed", guidance.counts.claimed],
            ["Waiting for Member", guidance.counts.waiting],
            ["Resolved", guidance.counts.resolved],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardBody>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
              </CardBody>
            </Card>
          ))}
        </div>
        {guidance.rows.length === 0 ? (
          <Card>
            <EmptyState title="No guidance activity matches the selected filters." />
          </Card>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title="Requests by Day" />
                <CardBody className="space-y-1 text-sm">
                  {groupGuidanceByDay(guidance.rows.map((row) => row.createdAt)).map((row) => (
                    <p key={row.key}>
                      {formatDayLabel(row.key)} → {row.count} {row.count === 1 ? "request" : "requests"}
                    </p>
                  ))}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Requests by Month" />
                <CardBody className="space-y-1 text-sm">
                  {groupGuidanceByMonth(guidance.rows.map((row) => row.createdAt)).map((row) => (
                    <p key={row.key}>
                      {formatMonthLabel(row.key)} → {row.count} {row.count === 1 ? "request" : "requests"}
                    </p>
                  ))}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Requests by Quarter" />
                <CardBody className="space-y-1 text-sm">
                  {groupGuidanceByQuarter(guidance.rows.map((row) => row.createdAt)).map((row) => (
                    <p key={row.key}>
                      {row.key} → {row.count} {row.count === 1 ? "request" : "requests"}
                    </p>
                  ))}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Requests by Event" />
                <CardBody className="space-y-1 text-sm">
                  {groupGuidanceByEvent(guidance.rows.map((row) => ({ eventTitle: row.event?.title ?? null }))).map(
                    (row) => (
                      <p key={row.key}>
                        {row.key} → {row.count} {row.count === 1 ? "guidance request" : "guidance requests"}
                      </p>
                    ),
                  )}
                </CardBody>
              </Card>
            </div>
            <Card>
              <CardHeader title="Detailed Guidance History" />
              <CardBody className="overflow-x-auto p-0">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Member</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Request Date</th>
                      <th className="px-4 py-3 font-medium">Event</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Handled By</th>
                      <th className="px-4 py-3 font-medium">Claimed At</th>
                      <th className="px-4 py-3 font-medium">Completed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortGuidanceRows(
                      guidance.rows.map((row) => ({ ...row, claimedByName: row.claimedBy?.name ?? null })),
                      filters.sort,
                    ).map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3">{fullName(row.member)}</td>
                        <td className="px-4 py-3">{GUIDANCE_LABELS[row.category]}</td>
                        <td className="whitespace-nowrap px-4 py-3">{formatDateTime(row.createdAt)}</td>
                        <td className="px-4 py-3">{row.event?.title ?? "No linked event"}</td>
                        <td className="px-4 py-3">{guidanceStatusLabel(row.status)}</td>
                        <td className="px-4 py-3">{row.claimedBy?.name ?? "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{row.claimedAt ? formatDateTime(row.claimedAt) : "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{row.resolvedAt ? formatDateTime(row.resolvedAt) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </>
        )}
      </section>
    </div>
  );
}
