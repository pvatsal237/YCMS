import { notFound } from "next/navigation";
import { requireCoordinator } from "@/lib/session";
import { getGuidance, guidanceAssignmentLabel } from "@/services/guidance";
import { canCoordinatorReleaseGuidance, isUnclaimedGuidance } from "@/lib/guidance-rules";
import { guidanceMessageAction } from "@/actions/guidance";
import { ClaimGuidanceButton } from "@/components/guidance/ClaimGuidanceButton";
import { GuidanceStatusButtons } from "@/components/guidance/GuidanceStatusButtons";
import { ReleaseGuidanceButton } from "@/components/guidance/ReleaseGuidanceButton";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/dates";
import { fullName, guidanceStatusLabel, guidanceStatusTone, GUIDANCE_LABELS } from "@/utils/format";

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
        description={`Current status: ${guidanceStatusLabel(request.status)}`}
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
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Status</span>
            <Badge tone={guidanceStatusTone(request.status)}>{guidanceStatusLabel(request.status)}</Badge>
          </div>
          <GuidanceStatusButtons requestId={request.id} currentStatus={request.status} />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Status</span>
          <Badge tone={guidanceStatusTone(request.status)}>{guidanceStatusLabel(request.status)}</Badge>
        </div>
      )}
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
