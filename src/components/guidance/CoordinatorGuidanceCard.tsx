import Link from "next/link";
import { ClaimGuidanceButton } from "@/components/guidance/ClaimGuidanceButton";
import { ReleaseGuidanceButton } from "@/components/guidance/ReleaseGuidanceButton";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { canCoordinatorReleaseGuidance, isActiveAssignedGuidance, isUnclaimedGuidance } from "@/lib/guidance-rules";
import { guidanceAssignmentLabel } from "@/services/guidance";
import { GUIDANCE_LABELS, fullName, guidanceStatusLabel, guidanceStatusTone, previewText } from "@/utils/format";
import type { GuidanceCategory, GuidanceStatus } from "@prisma/client";

type QueueRequest = {
  id: string;
  category: GuidanceCategory;
  message: string;
  status: GuidanceStatus;
  createdAt: Date;
  claimedById: string | null;
  claimedBy: { name: string | null } | null;
  member: { firstName: string; lastName: string; middleName?: string | null };
};

function requestedAtLabel(date: Date) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
    .format(date)
    .replace(",", "");
  const match = formatted.match(/^(.+\d{4}) (.+)$/);
  return match ? `Requested: ${match[1]} at ${match[2]}` : `Requested: ${formatted}`;
}

export function CoordinatorGuidanceCard({
  request,
  actorId,
}: {
  request: QueueRequest;
  actorId: string;
}) {
  const unclaimed = isUnclaimedGuidance(request);
  const canRelease = canCoordinatorReleaseGuidance(request, actorId);
  const assignedToMe = isActiveAssignedGuidance(request, actorId);

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-6 text-slate-900">{fullName(request.member)}</h3>
          <Badge tone={guidanceStatusTone(request.status)}>{guidanceStatusLabel(request.status)}</Badge>
        </div>
        <Badge tone="slate">{GUIDANCE_LABELS[request.category]}</Badge>
        <p className="text-sm leading-5 text-slate-700">{previewText(request.message)}</p>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-slate-800">{guidanceAssignmentLabel(request, actorId)}</p>
          <p className="text-sm text-slate-500">{requestedAtLabel(request.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {unclaimed ? <ClaimGuidanceButton requestId={request.id} /> : null}
          <Link href={`/guidance/${request.id}`}>
            <Button size="sm" variant={assignedToMe ? "primary" : "secondary"}>
              Open Request
            </Button>
          </Link>
          {canRelease ? <ReleaseGuidanceButton requestId={request.id} /> : null}
        </div>
      </CardBody>
    </Card>
  );
}
