import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getMemberById } from "@/services/members";
import { PageHeader } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { DeactivateMemberButton } from "@/components/members/DeactivateMemberButton";
import { formatDate } from "@/lib/dates";
import { getAlertPresentation } from "@/utils/immigration-alerts";
import {
  attendanceStatusLabel,
  documentTypeLabel,
  followUpStatusLabel,
  fullName,
  immigrationStatusLabel,
} from "@/utils/format";
import { AppError } from "@/lib/errors";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "COORDINATOR"]);
  const { id } = await params;
  let member;
  try {
    member = await getMemberById(id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }

  const canadian = member.addresses.find((item) => item.type === "CANADIAN");
  const home = member.addresses.find((item) => item.type === "HOME_COUNTRY");

  return (
    <div className="space-y-6">
      <PageHeader
        title={fullName(member)}
        description={member.email}
        action={
          <div className="flex gap-2">
            <Link href={`/members/${member.id}/edit`}>
              <Button>Edit</Button>
            </Link>
            {member.active ? <DeactivateMemberButton id={member.id} /> : null}
          </div>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Badge tone={member.active ? "green" : "slate"}>
          {member.active ? "Active" : "Inactive"}
        </Badge>
        {member.immigrationStatus ? (
          <Badge tone="teal">{immigrationStatusLabel(member.immigrationStatus.status)}</Badge>
        ) : null}
        {member.documents.map((doc) => {
          const alert = getAlertPresentation(doc.expiryDate);
          return (
            <Badge key={doc.id} tone={alert.tone}>
              {documentTypeLabel(doc.documentType)} · {alert.label}
            </Badge>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Overview" />
          <CardBody className="space-y-2 text-sm">
            <p>Date of birth: {formatDate(member.dateOfBirth)}</p>
            <p>Gender: {member.gender.replaceAll("_", " ")}</p>
            <p>Phone: {member.phone}</p>
            <p>Blood group: {member.bloodGroup ?? "—"}</p>
            <p>Date joined: {formatDate(member.dateJoined)}</p>
            <p>Referred by: {member.referredBy ?? "—"}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Contact" />
          <CardBody className="space-y-2 text-sm">
            <p>Email: {member.email}</p>
            <p>Phone: {member.phone}</p>
            <p>Emergency: {member.emergencyContact?.name ?? "—"} ({member.emergencyContact?.relationship ?? "—"})</p>
            <p>Emergency phone: {member.emergencyContact?.phone ?? "—"}</p>
            <p>Alternate: {member.emergencyContact?.alternatePhone ?? "—"}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Addresses" />
          <CardBody className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Canada</p>
              <p>{canadian?.addressLine1}</p>
              <p>{canadian?.addressLine2}</p>
              <p>
                {canadian?.city}, {canadian?.provinceState} {canadian?.postalCode}
              </p>
            </div>
            <div>
              <p className="font-medium">Home country</p>
              <p>{home?.addressLine1}</p>
              <p>
                {home?.city}, {home?.provinceState} {home?.postalCode}
              </p>
              <p>{home?.country}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Education" />
          <CardBody className="space-y-3 text-sm">
            {member.education.length === 0 ? <p>No education records.</p> : null}
            {member.education.map((item) => (
              <div key={item.id}>
                <p className="font-medium">
                  {item.program} · {item.institution}
                </p>
                <p className="text-slate-500">
                  {item.fieldOfStudy} · {item.country} · {formatDate(item.startDate)}
                  {item.currentlyStudying ? " · Currently studying" : ""}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Immigration" />
          <CardBody className="space-y-2 text-sm">
            <p>
              Status:{" "}
              {member.immigrationStatus
                ? immigrationStatusLabel(member.immigrationStatus.status)
                : "—"}
            </p>
            <p>College: {member.immigrationStatus?.college ?? "—"}</p>
            <p>Program: {member.immigrationStatus?.program ?? "—"}</p>
            <p>Work permit type: {member.immigrationStatus?.workPermitType ?? "—"}</p>
            {member.documents.map((doc) => {
              const alert = getAlertPresentation(doc.expiryDate);
              return (
                <p key={doc.id}>
                  {documentTypeLabel(doc.documentType)}: {formatDate(doc.expiryDate)}{" "}
                  <Badge tone={alert.tone}>{alert.label}</Badge>
                </p>
              );
            })}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Employment" />
          <CardBody className="space-y-2 text-sm">
            <p>Status: {member.employment?.employmentStatus ?? "—"}</p>
            <p>Employer: {member.employment?.employer ?? "—"}</p>
            <p>Job title: {member.employment?.jobTitle ?? "—"}</p>
            <p>Field-related: {member.employment?.fieldRelated ? "Yes" : "No"}</p>
            <p>Looking for job: {member.employment?.lookingForJob ? "Yes" : "No"}</p>
            <p>Desired field: {member.employment?.desiredField ?? "—"}</p>
            <p>Notes: {member.employment?.notes ?? "—"}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Accommodation" />
          <CardBody className="space-y-2 text-sm">
            <p>Looking: {member.accommodation?.looking ? "Yes" : "No"}</p>
            <p>Preferred location: {member.accommodation?.preferredLocation ?? "—"}</p>
            <p>Move-in: {formatDate(member.accommodation?.moveInDate)}</p>
            <p>Budget: {member.accommodation?.budget ?? "—"}</p>
            <p>Notes: {member.accommodation?.notes ?? "—"}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Attendance history" />
        {member.attendance.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">No attendance recorded yet.</p>
        ) : (
          <Table headers={["Date", "Meetup", "Status", "Recorded by"]}>
            {member.attendance.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">{formatDate(row.meetup.meetupDate)}</td>
                <td className="px-4 py-3">{row.meetup.title}</td>
                <td className="px-4 py-3">{attendanceStatusLabel(row.status)}</td>
                <td className="px-4 py-3">{row.recordedBy?.name ?? "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Follow-up history" />
        {member.followUps.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">No follow-ups.</p>
        ) : (
          <Table headers={["Reason", "Status", "Assigned", "Created"]}>
            {member.followUps.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">{row.reason}</td>
                <td className="px-4 py-3">{followUpStatusLabel(row.status)}</td>
                <td className="px-4 py-3">{row.assignedTo?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
