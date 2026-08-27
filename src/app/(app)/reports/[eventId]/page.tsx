import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoordinator } from "@/lib/session";
import { eventReport } from "@/services/reports";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { formatEventLongDate, formatTime12h, formatDateTime } from "@/lib/dates";
import { formatPhoneDisplay } from "@/services/members";
import { checkInLabel, eventStatusLabel, fullName, registrationLabel, registrationTypeLabel } from "@/utils/format";

export default async function EventReportPage({ params }: { params: Promise<{ eventId: string }> }) {
  await requireCoordinator();
  const { eventId } = await params;
  const report = await eventReport(eventId);
  if (!report) notFound();
  const { event, counts } = report;
  const speaker = [event.speakerName, event.speakerTitle, event.speakerOrganization].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.title}
        description={`${formatEventLongDate(event.eventDate)} · ${formatTime12h(event.startTime)} – ${formatTime12h(event.endTime)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/reports/export?eventId=${event.id}`}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Export CSV
            </a>
            <Link href="/reports">
              <Button size="sm" variant="ghost">
                Back to Reports
              </Button>
            </Link>
          </div>
        }
      />
      <Card>
        <CardHeader title="Event details" />
        <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="text-slate-500">Location</span>
            <span className="mt-1 block whitespace-pre-line text-slate-900">{event.location}</span>
          </p>
          <p>
            <span className="text-slate-500">Speaker</span>
            <span className="mt-1 block text-slate-900">{speaker || "Not listed"}</span>
          </p>
          <p>
            <span className="text-slate-500">Status</span>
            <span className="mt-1 block text-slate-900">{eventStatusLabel(event.status)}</span>
          </p>
          <p>
            <span className="text-slate-500">Capacity</span>
            <span className="mt-1 block text-slate-900">{event.capacity}</span>
          </p>
          <p>
            <span className="text-slate-500">Registered</span>
            <span className="mt-1 block text-slate-900">{counts.registered}</span>
          </p>
          <p>
            <span className="text-slate-500">Checked In</span>
            <span className="mt-1 block text-slate-900">{counts.checkedIn}</span>
          </p>
          <p>
            <span className="text-slate-500">No Shows</span>
            <span className="mt-1 block text-slate-900">{counts.noShows}</span>
          </p>
          <p>
            <span className="text-slate-500">Walk-Ins</span>
            <span className="mt-1 block text-slate-900">{counts.walkIns}</span>
          </p>
          <p>
            <span className="text-slate-500">Waitlisted</span>
            <span className="mt-1 block text-slate-900">{counts.waitlisted}</span>
          </p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Participants" />
        <CardBody className="p-0">
          <Table
            headers={[
              "Member Name",
              "Email",
              "Full Phone",
              "Registration Type",
              "Registration Status",
              "Check-In Status",
              "Checked-In Time",
            ]}
          >
            {report.event.registrations.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-4 py-3">{fullName(row.member)}</td>
                <td className="px-4 py-3">{row.member.email}</td>
                <td className="whitespace-nowrap px-4 py-3">{formatPhoneDisplay(row.member.phone)}</td>
                <td className="px-4 py-3">{registrationTypeLabel(row.type)}</td>
                <td className="px-4 py-3">{registrationLabel(row.status)}</td>
                <td className="px-4 py-3">{checkInLabel(row.checkInStatus)}</td>
                <td className="whitespace-nowrap px-4 py-3">{row.checkedInAt ? formatDateTime(row.checkedInAt) : "—"}</td>
              </tr>
            ))}
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
