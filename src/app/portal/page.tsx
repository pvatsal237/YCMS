import { getMemberPortalData } from "@/services/member-portal";
import { requireMemberSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { formatDate, formatTime12h } from "@/lib/dates";
import { documentTypeLabel, fullName } from "@/utils/format";
import { ProfileChangeRequestForm } from "@/components/members/ProfileChangeRequestForm";
import { DocumentRenewalActions } from "@/components/members/DocumentRenewalActions";
import { AssistanceRequestMenu } from "@/components/assistance/AssistanceRequestForm";
import { followUpOutcomeLabel } from "@/utils/follow-up-outcomes";
import { getAlertPresentation } from "@/utils/immigration-alerts";
import { RideRequestMenu } from "@/components/rides/RideRequestMenu";
import { listMemberAssistanceRequests, listStaffContactsByRole } from "@/services/assistance";
import { listMemberRideRequests, listUpcomingEvents } from "@/services/events";

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
  const [coordinators, administrators, upcomingEvents, rideRequests, myAssistance] = await Promise.all([
    listStaffContactsByRole("COORDINATOR"),
    listStaffContactsByRole("ADMIN"),
    listUpcomingEvents(6),
    listMemberRideRequests(member.id),
    listMemberAssistanceRequests(member.id),
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
        title="Home"
        description="Upcoming events, attendance, and your requests."
        action={
          <AssistanceRequestMenu
            coordinators={coordinators}
            administrators={administrators}
            eligibleDocuments={eligibleDocuments}
          />
        }
      />

      {upcomingMeetup ? (
        <Card>
          <CardHeader
            title="Weekly Youth Meetup"
            description={`${formatDate(upcomingMeetup.meetupDate)} · ${
              upcomingMeetup.startTime && upcomingMeetup.endTime
                ? `${formatTime12h(upcomingMeetup.startTime)} – ${formatTime12h(upcomingMeetup.endTime)}`
                : "8:00 PM – 10:00 PM"
            }`}
            action={
              <RideRequestMenu
                meetupId={upcomingMeetup.id}
                events={[
                  {
                    id: upcomingMeetup.id,
                    title: upcomingMeetup.title,
                    meetupDate: upcomingMeetup.meetupDate,
                    eventType: upcomingMeetup.eventType,
                    location: upcomingMeetup.location,
                  },
                ]}
              />
            }
          />
          <CardBody className="text-sm">
            <p className="text-lg font-semibold text-slate-900">{upcomingMeetup.title}</p>
            <p className="mt-1 text-slate-600">{upcomingMeetup.location}</p>
            <p className="mt-2 text-slate-700">
              <span className="font-medium text-slate-900">Cuisine:</span>{" "}
              {upcomingMeetup.cuisine || "To be announced"}
            </p>
          </CardBody>
        </Card>
      ) : null}

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

      <div id="profile">
      <Card>
        <CardHeader title="Contact information" />
        <CardBody className="space-y-1 text-sm">
          <p className="font-medium text-slate-900">{fullName(member)}</p>
          <p>{member.email}</p>
          <p>{member.phone}</p>
          <p className="text-slate-500">Joined {formatDate(member.dateJoined)}</p>
        </CardBody>
      </Card>
      </div>

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

      <div id="events">
      <Card>
        <CardHeader title="Upcoming events" />
        {upcomingEvents.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No upcoming events.</p>
        ) : (
          <Table headers={["Event", "Date", "Venue"]}>
            {upcomingEvents.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-3">{event.title}</td>
                <td className="px-4 py-3">
                  {formatDate(event.meetupDate)}
                  {event.startTime ? ` · ${formatTime12h(event.startTime)}` : ""}
                </td>
                <td className="px-4 py-3">{event.location}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      </div>

      <div id="attendance">
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
      </div>

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

      <div id="requests">
      <Card>
        <CardHeader title="My requests" />
        <CardBody className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-slate-900">Assistance</p>
            {myAssistance.length === 0 ? (
              <p className="text-slate-500">No assistance requests.</p>
            ) : (
              myAssistance.slice(0, 6).map((item) => (
                <p key={item.id} className="mt-1">
                  {item.category} · {item.status} · {formatDate(item.createdAt)}
                </p>
              ))
            )}
          </div>
          <div>
            <p className="font-medium text-slate-900">Ride requests</p>
            {rideRequests.length === 0 ? (
              <p className="text-slate-500">No ride requests.</p>
            ) : (
              rideRequests.map((item) => (
                <p key={item.id} className="mt-1">
                  {item.meetup.title} · {item.status}
                  {item.driver
                    ? ` · Driver ${item.driver.name}${item.driver.phone ? ` (${item.driver.phone})` : ""}`
                    : ""}
                </p>
              ))
            )}
            <p className="mt-2 text-xs text-slate-500">
              If the driver does not answer, please leave a voicemail with your name and callback number.
            </p>
          </div>
        </CardBody>
      </Card>
      </div>

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
