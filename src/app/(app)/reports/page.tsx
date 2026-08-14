import { requireRole } from "@/lib/session";
import {
  getAttendanceReport,
  getImmigrationExpiryReport,
  getMemberReport,
} from "@/services/reports";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { formatDate } from "@/lib/dates";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(["ADMIN", "COORDINATOR"]);
  const params = await searchParams;
  const [attendance, members, immigration] = await Promise.all([
    getAttendanceReport(params.from, params.to),
    getMemberReport(),
    getImmigrationExpiryReport(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Generated from live PostgreSQL data." />
      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            From
            <input type="date" name="from" defaultValue={params.from} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            To
            <input type="date" name="to" defaultValue={params.to} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
            Apply date range
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a className="text-teal-700" href="/api/reports/export?type=attendance">
            Export attendance CSV
          </a>
          <a className="text-teal-700" href="/api/reports/export?type=members">
            Export members CSV
          </a>
          <a className="text-teal-700" href="/api/reports/export?type=immigration">
            Export immigration CSV
          </a>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Attendance report" />
          <CardBody className="space-y-2 text-sm">
            <p>Meetup count: {attendance.meetupCount}</p>
            <p>Average attendance: {attendance.averageAttendance}%</p>
            <p>Frequently absent members: {attendance.frequentlyAbsent.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Member report" />
          <CardBody className="space-y-2 text-sm">
            <p>Total members: {members.total}</p>
            <p>Active members: {members.active}</p>
            <p>Inactive members: {members.inactive}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Immigration expiry report" />
          <CardBody className="space-y-2 text-sm">
            <p>Expiring within 3 months: {immigration.buckets.within3}</p>
            <p>Expiring within 6 months: {immigration.buckets.within6}</p>
            <p>Expiring within 12 months: {immigration.buckets.within12}</p>
            <p>Already expired: {immigration.buckets.expired}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Immigration status distribution" />
        <Table headers={["Status", "Count"]}>
          {members.immigrationDistribution.map((row) => (
            <tr key={row.status}>
              <td className="px-4 py-3">{row.label}</td>
              <td className="px-4 py-3">{row.count}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card>
        <CardHeader title="New members by month" />
        <Table headers={["Month", "New members"]}>
          {members.newMembersByMonth.map((row) => (
            <tr key={row.month}>
              <td className="px-4 py-3">{row.month}</td>
              <td className="px-4 py-3">{row.count}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card>
        <CardHeader title="Member attendance percentage" />
        <Table headers={["Member", "Present", "Absent", "Attendance %"]}>
          {attendance.memberRows.slice(0, 25).map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">{row.name}</td>
              <td className="px-4 py-3">{row.present}</td>
              <td className="px-4 py-3">{row.absent}</td>
              <td className="px-4 py-3">{row.percent}%</td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card>
        <CardHeader title="Frequently absent members" />
        <Table headers={["Member", "Absences", "Attendance %"]}>
          {attendance.frequentlyAbsent.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">{row.name}</td>
              <td className="px-4 py-3">{row.absent}</td>
              <td className="px-4 py-3">{row.percent}%</td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card>
        <CardHeader title="Meetups in range" />
        <Table headers={["Date", "Title", "Present", "Absent"]}>
          {attendance.meetups.map((meetup) => (
            <tr key={meetup.id}>
              <td className="px-4 py-3">{formatDate(meetup.date)}</td>
              <td className="px-4 py-3">{meetup.title}</td>
              <td className="px-4 py-3">{meetup.present}</td>
              <td className="px-4 py-3">{meetup.absent}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
