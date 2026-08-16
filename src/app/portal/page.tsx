import { getMemberPortalData } from "@/services/member-portal";
import { requireMemberSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { formatDate } from "@/lib/dates";
import { fullName } from "@/utils/format";
import { ProfileChangeRequestForm } from "@/components/members/ProfileChangeRequestForm";
import { followUpOutcomeLabel } from "@/utils/follow-up-outcomes";

export default async function MemberPortalPage() {
  const user = await requireMemberSession();
  const { member, upcomingMeetup } = await getMemberPortalData(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your portal"
        description="This view is limited to your own records."
      />

      <Card>
        <CardHeader title="Contact information" />
        <CardBody className="space-y-1 text-sm">
          <p className="font-medium text-slate-900">{fullName(member)}</p>
          <p>{member.email}</p>
          <p>{member.phone}</p>
          <p className="text-slate-500">Joined {formatDate(member.dateJoined)}</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Immigration documents" description="Type and expiry only." />
        {member.documents.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No documents on file.</p>
        ) : (
          <Table headers={["Type", "Expiry"]}>
            {member.documents.map((doc, index) => (
              <tr key={`${doc.documentType}-${index}`}>
                <td className="px-4 py-3">{doc.documentType.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">{formatDate(doc.expiryDate)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Upcoming meetup" />
        <CardBody>
          {upcomingMeetup ? (
            <div className="text-sm">
              <p className="font-medium text-slate-900">{upcomingMeetup.title}</p>
              <p className="text-slate-500">
                {formatDate(upcomingMeetup.meetupDate)}
                {upcomingMeetup.location ? ` · ${upcomingMeetup.location}` : ""}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No upcoming meetup is scheduled yet.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Attendance history" />
        {member.attendance.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No attendance recorded yet.</p>
        ) : (
          <Table headers={["Meetup", "Date", "Status"]}>
            {member.attendance.map((row, index) => (
              <tr key={`${row.meetup.title}-${index}`}>
                <td className="px-4 py-3">{row.meetup.title}</td>
                <td className="px-4 py-3">{formatDate(row.meetup.meetupDate)}</td>
                <td className="px-4 py-3">
                  <Badge>{row.status}</Badge>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Follow-up status" />
        {member.followUps.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No follow-ups on your record.</p>
        ) : (
          <Table headers={["Status", "Outcome", "Next contact"]}>
            {member.followUps.map((item, index) => (
              <tr key={`${item.createdAt.toISOString()}-${index}`}>
                <td className="px-4 py-3">{item.status}</td>
                <td className="px-4 py-3">
                  {item.lastOutcome ? followUpOutcomeLabel(item.lastOutcome) : "—"}
                </td>
                <td className="px-4 py-3">
                  {item.nextFollowUpAt ? formatDate(item.nextFollowUpAt) : "—"}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Request a profile update"
          description="You cannot edit your profile directly. Submit a note for a coordinator to review later."
        />
        <CardBody>
          <ProfileChangeRequestForm />
        </CardBody>
      </Card>
    </div>
  );
}
