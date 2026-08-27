import Link from "next/link";
import { requireCoordinator } from "@/lib/session";
import { eventReport, reportsOverview } from "@/services/reports";
import { listCoordinatorEvents } from "@/services/events";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { PageLoadError } from "@/components/ui/PageLoadError";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { loadPageData } from "@/lib/page-data";
import { formatEventLongDate } from "@/lib/dates";
import { eventStatusLabel } from "@/utils/format";

export default async function ReportsPage() {
  await requireCoordinator();
  const loaded = await loadPageData("reports.page", async () => {
    const [events, overview] = await Promise.all([listCoordinatorEvents(), reportsOverview()]);
    const completed = events.filter((event) => event.status === "COMPLETED");
    const other = events.filter((event) => event.status !== "COMPLETED");
    const withCounts = await Promise.all(
      completed.map(async (event) => {
        const report = await eventReport(event.id);
        return { event, counts: report?.counts };
      }),
    );
    return { overview, completed: withCounts, other };
  });

  if (!loaded.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" description="Attendance and participation for IYCM events." />
        <PageLoadError description="We could not load reports. Please try again." />
      </div>
    );
  }

  const { overview, completed, other } = loaded.data;
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
    </div>
  );
}
