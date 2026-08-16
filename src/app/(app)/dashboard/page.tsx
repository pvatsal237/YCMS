import Link from "next/link";
import { requireStaffSession } from "@/lib/session";
import { getDashboardData } from "@/services/dashboard";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { formatDate } from "@/lib/dates";
import { fullName, immigrationStatusLabel } from "@/utils/format";
import { canViewImmigration, canViewFollowUps } from "@/lib/authorization";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      </CardBody>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireStaffSession();
  const data = await getDashboardData(user.role);
  const showSensitive = canViewImmigration(user.role);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Live counts from the membership and attendance database."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total active members" value={data.stats.totalActiveMembers} />
        <StatCard label="Present at latest meetup" value={data.stats.presentLatest} />
        <StatCard label="Absent at latest meetup" value={data.stats.absentLatest} />
        <StatCard label="New members this month" value={data.stats.newMembersThisMonth} />
        {showSensitive ? (
          <>
            <StatCard
              label="Immigration documents expiring soon"
              value={data.stats.immigrationExpiringSoon}
            />
            <StatCard label="Follow-ups required" value={data.stats.followUpsRequired} />
          </>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Attendance overview" description="Recent meetup attendance percentage." />
          <CardBody>
            <AttendanceChart data={data.attendanceTrend} />
          </CardBody>
        </Card>

        {canViewFollowUps(user.role) ? (
          <Card>
            <CardHeader
              title="Follow-up required"
              description="Members with three consecutive absences."
              action={
                <Link href="/follow-ups" className="text-sm text-teal-700">
                  View all
                </Link>
              }
            />
            {data.followUps.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500">No open absence follow-ups.</p>
            ) : (
              <Table headers={["Member", "Phone", "Status"]}>
                {data.followUps.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <Link href={`/follow-ups/${item.id}`} className="font-medium text-teal-800">
                        {fullName(item.member)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{item.member.phone}</td>
                    <td className="px-4 py-3">
                      <Badge tone="orange">{item.status}</Badge>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : (
          <Card>
            <CardHeader title="Current meetup" />
            <CardBody>
              {data.latestMeetup ? (
                <div>
                  <p className="font-medium text-slate-900">{data.latestMeetup.title}</p>
                  <p className="text-sm text-slate-500">
                    {formatDate(data.latestMeetup.meetupDate)}
                  </p>
                  <Link
                    href={`/attendance/${data.latestMeetup.id}`}
                    className="mt-3 inline-block text-sm font-medium text-teal-700"
                  >
                    Take attendance
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No meetup has been created yet.</p>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {showSensitive ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader
              title="Immigration alerts"
              action={
                <Link href="/immigration" className="text-sm text-teal-700">
                  View all
                </Link>
              }
            />
            {data.immigrationAlerts.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500">No urgent expiry alerts.</p>
            ) : (
              <Table headers={["Member", "Document", "Expiry", "Days", "Status"]}>
                {data.immigrationAlerts.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <Link href={`/members/${row.memberId}`} className="font-medium text-teal-800">
                        {row.memberName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.documentLabel}</td>
                    <td className="px-4 py-3">{formatDate(row.expiryDate)}</td>
                    <td className="px-4 py-3">{row.daysRemaining}</td>
                    <td className="px-4 py-3">
                      <Badge tone={row.tone}>{row.label}</Badge>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
          <Card>
            <CardHeader title="Recent members" />
            <Table headers={["Name", "Joined", "Status"]}>
              {data.recentMembers.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3">
                    <Link href={`/members/${member.id}`} className="font-medium text-teal-800">
                      {fullName(member)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatDate(member.dateJoined)}</td>
                  <td className="px-4 py-3">
                    {member.immigrationStatus
                      ? immigrationStatusLabel(member.immigrationStatus.status)
                      : "—"}
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
