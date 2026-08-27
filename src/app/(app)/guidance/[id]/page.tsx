import { notFound } from "next/navigation";
import { requireCoordinator } from "@/lib/session";
import { getGuidance, guidanceAssignmentLabel } from "@/services/guidance";
import { canCoordinatorReleaseGuidance, isUnclaimedGuidance } from "@/lib/guidance-rules";
import { guidanceMessageAction, guidanceStatusAction } from "@/actions/guidance";
import { ClaimGuidanceButton } from "@/components/guidance/ClaimGuidanceButton";
import { ReleaseGuidanceButton } from "@/components/guidance/ReleaseGuidanceButton";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/dates";
import { fullName, guidanceStatusLabel, GUIDANCE_LABELS } from "@/utils/format";

export default async function GuidanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireCoordinator();
  const { id } = await params;
  const request = await getGuidance(id);
  if (!request) notFound();
  const isOwner = request.claimedById === actor.id;
  const unclaimed = isUnclaimedGuidance(request);
  const canRelease = canCoordinatorReleaseGuidance(request, actor.id);
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${fullName(request.member)} · ${GUIDANCE_LABELS[request.category]}`}
        description={guidanceStatusLabel(request.status)}
      />
      <Card>
        <CardBody className="space-y-2 text-sm">
          <p>{request.message}</p>
          {request.customTopic ? <p>Topic: {request.customTopic}</p> : null}
          <p>{request.member.email}</p>
          <p>{guidanceAssignmentLabel(request, actor.id)}</p>
          <p>Requested: {formatDateTime(request.createdAt)}</p>
          {request.claimedAt ? <p>Claimed: {formatDateTime(request.claimedAt)}</p> : null}
          {request.resolvedAt ? <p>Completed: {formatDateTime(request.resolvedAt)}</p> : null}
          <p>{request.event?.title ?? "No linked event"}</p>
          {unclaimed ? <ClaimGuidanceButton requestId={request.id} /> : null}
          {canRelease ? <ReleaseGuidanceButton requestId={request.id} /> : null}
        </CardBody>
      </Card>
      {isOwner ? (
        <div className="flex flex-wrap gap-2">
          {(["CLAIMED", "WAITING_FOR_MEMBER", "RESOLVED"] as const).map((status) => (
            <form action={guidanceStatusAction} key={status}>
              <input type="hidden" name="id" value={request.id} />
              <input type="hidden" name="status" value={status} />
              <Button type="submit" size="sm" variant="secondary">{guidanceStatusLabel(status)}</Button>
            </form>
          ))}
        </div>
      ) : null}
      <Card>
        <CardBody className="space-y-3">
          {request.messages.map((message) => (
            <p key={message.id} className="text-sm">
              <span className="font-medium">{message.user.name}:</span> {message.body}
            </p>
          ))}
          {isOwner ? (
            <form action={guidanceMessageAction} className="flex gap-2">
              <input type="hidden" name="id" value={request.id} />
              <input name="body" required placeholder="Short message" className="flex-1 rounded-md border px-3 py-2 text-sm" />
              <Button type="submit" size="sm">Send</Button>
            </form>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
