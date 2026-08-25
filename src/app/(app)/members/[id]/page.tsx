import { notFound } from "next/navigation";
import { getMember } from "@/services/members";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { fullName } from "@/utils/format";
import { maskPhone } from "@/lib/privacy";
import { formatDate } from "@/lib/dates";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getMember(id).catch(() => null);
  if (!member) notFound();
  const checkByEvent = new Map(member.checkIns.map((row) => [row.eventId, row]));
  return (
    <div className="space-y-4">
      <PageHeader title={fullName(member)} description={member.email} />
      <p className="text-sm text-stone-600">Phone {maskPhone(member.phone)}</p>
      <Card>
        <CardHeader title="Event history" />
        <CardBody className="space-y-2 text-sm">
          {member.registrations.map((row) => {
            const check = checkByEvent.get(row.eventId);
            let outcome = row.status === "WAITLISTED" ? "Waitlisted" : "Registered";
            if (check?.status === "CHECKED_IN") outcome = "Checked In";
            else if (check?.status === "NO_SHOW") outcome = "No Show";
            else if (row.status === "CANCELLED") outcome = "Cancelled";
            return (
              <div key={row.id}>
                {formatDate(row.event.eventDate)} — {row.event.title} — {outcome}
              </div>
            );
          })}
          {member.registrations.length === 0 ? <p className="text-stone-500">No events yet.</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}
