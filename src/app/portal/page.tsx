import { getMemberPortalData } from "@/services/member-portal";
import { requireMemberSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { formatDate } from "@/lib/dates";
import { documentTypeLabel, fullName } from "@/utils/format";
import { ProfileChangeRequestForm } from "@/components/members/ProfileChangeRequestForm";
import { DocumentRenewalActions } from "@/components/members/DocumentRenewalActions";
import { AssistanceRequestMenu } from "@/components/assistance/AssistanceRequestForm";
import { followUpOutcomeLabel } from "@/utils/follow-up-outcomes";
import { getAlertPresentation } from "@/utils/immigration-alerts";
import { listStaffContactsByRole } from "@/services/assistance";

const NOTICE_TONES = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-900",
  yellow: "border-amber-200 bg-amber-50 text-amber-900",
  orange: "border-orange-200 bg-orange-50 text-orange-900",
  red: "border-red-200 bg-red-50 text-red-900",
  expired: "border-slate-800 bg-slate-800 text-white",
};

export default async function MemberPortalPage() {
  const user = await requireMemberSession();
  const { member, upcomingMeetup, pendingRequests, staffContacts } =
    await getMemberPortalData(user);
  const [coordinators, administrators] = await Promise.all([
    listStaffContactsByRole("COORDINATOR"),
    listStaffContactsByRole("ADMIN"),
  ]);
  const documentNotices = member.documents
    .map((doc) => ({ doc, alert: getAlertPresentation(doc.expiryDate) }))
    .filter((item) => item.alert.level !== "VALID");
  const eligibleDocuments = documentNotices.map(({ doc, alert }) => ({
    id: doc.id,
    documentType: doc.documentType,
    expiryDateLabel: formatDate(doc.expiryDate),
    daysRemaining: alert.daysRemaining,
    alertLabel: alert.label,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your portal"
        description="This view is limited to your own records."
        action={
          <AssistanceRequestMenu
            coordinators={coordinators}
            administrators={administrators}
            eligibleDocuments={eligibleDocuments}
          />
        }
      />

      {documentNotices.length > 0 ? (
        <div className="space-y-3">
          {documentNotices.map(({ doc, alert }) => {
            const pending = pendingRequests.find((item) => item.documentId === doc.id);
            return (
              <div
                key={doc.id}
                className={`rounded-xl border p-4 ${NOTICE_TONES[alert.tone]}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={alert.tone}>{alert.label}</Badge>
                  <p className="font-medium">
                    Your {documentTypeLabel(doc.documentType)} expires {formatDate(doc.expiryDate)}
                    {alert.daysRemaining < 0
                      ? ` (${Math.abs(alert.daysRemaining)} days overdue).`
                      : ` (${alert.daysRemaining} days remaining).`}
                  </p>
                </div>
                <DocumentRenewalActions
                  documentId={doc.id}
                  staffContacts={staffContacts}
                  current={
                    pending
                      ? {
                          requestType: pending.requestType ?? "NEED_ASSISTANCE",
                          assignedToUserId: pending.assignedToUserId,
                          proposedExpiry: pending.proposedExpiry,
                        }
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      ) : null}

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
        <CardHeader
          title="Immigration documents"
          description="Type and expiry only. You can change a status here if you selected the wrong option."
        />
        {member.documents.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No documents on file.</p>
        ) : (
          <Table headers={["Type", "Expiry", "Status", "Your response"]}>
            {member.documents.map((doc) => {
              const alert = getAlertPresentation(doc.expiryDate);
              const pending = pendingRequests.find((item) => item.documentId === doc.id);
              return (
                <tr key={doc.id}>
                  <td className="px-4 py-3 align-top">{documentTypeLabel(doc.documentType)}</td>
                  <td className="px-4 py-3 align-top">{formatDate(doc.expiryDate)}</td>
                  <td className="px-4 py-3 align-top">
                    <Badge tone={alert.tone}>{alert.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <DocumentRenewalActions
                      compact
                      documentId={doc.id}
                      staffContacts={staffContacts}
                      current={
                        pending
                          ? {
                              requestType: pending.requestType ?? "NEED_ASSISTANCE",
                              assignedToUserId: pending.assignedToUserId,
                              proposedExpiry: pending.proposedExpiry,
                            }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              );
            })}
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
