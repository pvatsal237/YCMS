import Link from "next/link";
import { requireSession } from "@/lib/session";
import { listMeetups } from "@/services/attendance";
import { canCreateMeetup } from "@/lib/authorization";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { formatDate } from "@/lib/dates";

export default async function AttendancePage() {
  const user = await requireSession();
  const meetups = await listMeetups();

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Weekly meetups and recorded attendance."
        action={
          canCreateMeetup(user.role) ? (
            <Link href="/attendance/new">
              <Button>Create meetup</Button>
            </Link>
          ) : null
        }
      />
      <Card>
        {meetups.length === 0 ? (
          <EmptyState title="No meetups yet" description="Create a weekly meetup to start taking attendance." />
        ) : (
          <Table
            headers={[
              "Meetup date",
              "Title",
              "Location",
              "Present",
              "Absent",
              "Total recorded",
              "Attendance %",
              "Actions",
            ]}
          >
            {meetups.map((meetup) => (
              <tr key={meetup.id}>
                <td className="px-4 py-3">{formatDate(meetup.meetupDate)}</td>
                <td className="px-4 py-3 font-medium">{meetup.title}</td>
                <td className="px-4 py-3">{meetup.location}</td>
                <td className="px-4 py-3">{meetup.present}</td>
                <td className="px-4 py-3">{meetup.absent}</td>
                <td className="px-4 py-3">{meetup.recorded}</td>
                <td className="px-4 py-3">{meetup.attendancePercentage}%</td>
                <td className="px-4 py-3">
                  <Link href={`/attendance/${meetup.id}`} className="text-sm text-teal-700">
                    Take attendance
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
