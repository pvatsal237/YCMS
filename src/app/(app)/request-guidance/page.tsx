import { requireMemberSession } from "@/lib/session";
import { listMyGuidance } from "@/services/guidance";
import { guidanceMessageAction } from "@/actions/guidance";
import { RequestGuidanceForm } from "@/components/guidance/RequestGuidanceForm";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { guidanceStatusLabel, GUIDANCE_LABELS } from "@/utils/format";

export default async function RequestGuidancePage() {
  const user = await requireMemberSession();
  const rows = await listMyGuidance(user.memberId!);
  return (
    <div className="space-y-6">
      <PageHeader title="Request Guidance" description="Send a short request. A coordinator may claim it and reply here." />
      <RequestGuidanceForm />
      {rows.map((row) => (
        <Card key={row.id}>
          <CardBody className="space-y-2 text-sm">
            <p className="font-medium">{GUIDANCE_LABELS[row.category]} · {guidanceStatusLabel(row.status)}</p>
            <p>{row.message}</p>
            {row.messages.map((message) => (
              <p key={message.id} className="text-slate-600">{message.body}</p>
            ))}
            {row.status !== "RESOLVED" ? (
              <form action={guidanceMessageAction} className="flex gap-2">
                <input type="hidden" name="id" value={row.id} />
                <input name="body" required placeholder="Reply" className="flex-1 rounded-md border px-3 py-2" />
                <Button type="submit" size="sm">Send</Button>
              </form>
            ) : null}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
