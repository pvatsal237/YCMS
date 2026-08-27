import { requireMemberSession } from "@/lib/session";
import { listMyGuidance } from "@/services/guidance";
import { RequestGuidanceForm } from "@/components/guidance/RequestGuidanceForm";
import { MemberGuidanceCard } from "@/components/guidance/MemberGuidanceCard";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Card";

export default async function RequestGuidancePage() {
  const user = await requireMemberSession();
  const memberId = user.memberId;
  const rows = memberId ? await listMyGuidance(memberId) : [];
  return (
    <div className="space-y-6">
      <PageHeader title="Request Guidance" description="Send a short request. A coordinator may claim it and reply here." />
      <RequestGuidanceForm />
      {rows.length === 0 ? (
        <Card>
          <EmptyState title="No guidance requests yet." description="Submitted requests will appear here." />
        </Card>
      ) : (
        rows.map((row) => <MemberGuidanceCard key={row.id} request={row} memberId={memberId!} />)
      )}
    </div>
  );
}
