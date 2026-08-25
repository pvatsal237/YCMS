import { requireMemberSession } from "@/lib/session";
import { memberGuidance } from "@/services/guidance";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { GuidanceForm } from "@/components/guidance/GuidanceForm";
import { Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { sendGuidanceMessageAction } from "@/actions/guidance";
import { guidanceCategoryLabel, guidanceStatusLabel } from "@/utils/format";

export default async function PortalGuidancePage() {
  const user = await requireMemberSession();
  const requests = await memberGuidance(user.memberId!);
  return (
    <div className="space-y-6">
      <PageHeader title="Request Guidance" />
      <Card><CardBody><GuidanceForm /></CardBody></Card>
      {requests.map((request) => (
        <Card key={request.id}>
          <CardBody className="space-y-2">
            <p className="font-medium">{guidanceCategoryLabel(request.category)} · {guidanceStatusLabel(request.status)}</p>
            {request.assignedTo ? <p className="text-sm text-teal-800">Assigned to: {request.assignedTo.name}</p> : null}
            <p className="text-sm text-stone-600">{request.message}</p>
            {request.messages.map((message) => (
              <div key={message.id} className="rounded-md bg-stone-100 px-3 py-2 text-sm">
                <span className="text-xs text-stone-500">{message.author.name}</span>
                <p>{message.body}</p>
              </div>
            ))}
            {request.status !== "RESOLVED" && request.assignedTo ? (
              <form action={async (formData) => { "use server"; await sendGuidanceMessageAction(request.id, formData); }} className="space-y-2">
                <Textarea name="body" placeholder="Tuesday at 6:30 works for me." />
                <Button type="submit" size="sm">Reply</Button>
              </form>
            ) : null}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
