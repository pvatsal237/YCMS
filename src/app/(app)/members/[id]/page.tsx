import { notFound } from "next/navigation";
import { requireCoordinator } from "@/lib/session";
import { getMember, maskPhone } from "@/services/members";
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
      <PageHeader title={fullName(member)} description={member.email} />
      <Card>
        <CardBody className="text-sm">
          <p>Phone: {maskPhone(member.phone)}</p>
          <p className="mt-2 text-slate-500">Emergency contact is hidden from this list.</p>
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
