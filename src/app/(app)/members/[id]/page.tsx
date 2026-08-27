import { notFound } from "next/navigation";
import { requireCoordinator } from "@/lib/session";
import { getMember, formatPhoneDisplay } from "@/services/members";
import { memberHistory } from "@/services/reports";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { checkInLabel, fullName, registrationLabel } from "@/utils/format";
import { formatDate } from "@/lib/dates";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCoordinator();
  const { id } = await params;
  const member = await getMember(id);
  if (!member) notFound();
  const history = await memberHistory(id);
  return (
    <div className="space-y-6">
      <PageHeader title={fullName(member)} description={member.active ? "Active member" : "Inactive member"} />
      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-slate-500">Name</p>
            <p className="mt-1 font-medium text-slate-900">{fullName(member)}</p>
          </div>
          <div>
            <p className="text-slate-500">Email</p>
            <p className="mt-1 font-medium text-slate-900">{member.email}</p>
          </div>
          <div>
            <p className="text-slate-500">Phone</p>
            <p className="mt-1 font-medium text-slate-900">{formatPhoneDisplay(member.phone)}</p>
          </div>
          <div>
            <p className="text-slate-500">Status</p>
            <p className="mt-1 font-medium text-slate-900">{member.active ? "Active" : "Inactive"}</p>
          </div>
          <div>
            <p className="text-slate-500">Emergency Contact Name</p>
            <p className="mt-1 font-medium text-slate-900">{member.emergencyContactName || "Not provided"}</p>
          </div>
          <div>
            <p className="text-slate-500">Emergency Contact Phone</p>
            <p className="mt-1 font-medium text-slate-900">{formatPhoneDisplay(member.emergencyContactPhone)}</p>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="text-sm space-y-2">
          <p>Registered: {history.registered} · Checked in: {history.checkedIn} · No shows: {history.noShows}</p>
          {history.rows.map((row) => (
            <p key={row.id}>
              {row.event.title} · {formatDate(row.event.eventDate)} · {registrationLabel(row.status)} · {checkInLabel(row.checkInStatus)}
            </p>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
