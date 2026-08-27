import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/dates";
import { guidanceHandledByLabel } from "@/lib/guidance-rules";
import { GUIDANCE_LABELS, fullName, guidanceStatusLabel, guidanceStatusTone, previewText } from "@/utils/format";
import type { GuidanceCategory, GuidanceStatus } from "@prisma/client";

export function GuidanceHistoryRow({
  request,
}: {
  request: {
    id: string;
    category: GuidanceCategory;
    customTopic: string | null;
    message: string;
    status: GuidanceStatus;
    createdAt: Date;
    claimedAt: Date | null;
    resolvedAt: Date | null;
    claimedBy: { name: string | null } | null;
    member: { firstName: string; lastName: string; middleName?: string | null; email: string };
    event: { title: string } | null;
  };
}) {
  return (
    <div className="grid gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{fullName(request.member)}</p>
        <p className="text-xs text-slate-500">{GUIDANCE_LABELS[request.category]}</p>
        {request.customTopic ? <p className="text-xs text-slate-500">Topic: {request.customTopic}</p> : null}
        <p className="mt-1 truncate text-slate-600">{previewText(request.message, 90)}</p>
      </div>
      <div className="text-slate-600">
        <p>{guidanceHandledByLabel(request.claimedBy?.name)}</p>
        <p className="text-xs text-slate-500">{request.event?.title ?? "No linked event"}</p>
      </div>
      <div className="text-xs text-slate-500">
        <p>Requested {formatDateTime(request.createdAt)}</p>
        {request.claimedAt ? <p>Claimed {formatDateTime(request.claimedAt)}</p> : null}
        {request.resolvedAt ? <p>Completed {formatDateTime(request.resolvedAt)}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={guidanceStatusTone(request.status)}>{guidanceStatusLabel(request.status)}</Badge>
        <Link href={`/guidance/${request.id}`}>
          <Button size="sm" variant="secondary">
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );
}
