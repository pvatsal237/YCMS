import Link from "next/link";
import { requireCoordinator } from "@/lib/session";
import { guidanceAssignmentLabel, listGuidanceForCoordinator } from "@/services/guidance";
import { canCoordinatorReleaseGuidance, isUnclaimedGuidance } from "@/lib/guidance-rules";
import { ClaimGuidanceButton } from "@/components/guidance/ClaimGuidanceButton";
import { ReleaseGuidanceButton } from "@/components/guidance/ReleaseGuidanceButton";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { PageLoadError } from "@/components/ui/PageLoadError";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { loadPageData } from "@/lib/page-data";
import { formatDateTime } from "@/lib/dates";
import { fullName, GUIDANCE_LABELS, guidanceStatusLabel, guidanceStatusTone, previewText } from "@/utils/format";

export default async function GuidancePage() {
  const actor = await requireCoordinator();
  const loaded = await loadPageData("guidance.page", listGuidanceForCoordinator);
  if (!loaded.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="Guidance" description="Claim a request to become the owner. There is no auto-assignment." />
        <PageLoadError description="We could not load guidance requests. Please try again." />
      </div>
    );
  }

  const rows = loaded.data;
  const unclaimed = rows.filter(isUnclaimedGuidance);
  const assigned = rows.filter((row) => !isUnclaimedGuidance(row));

  return (
    <div className="space-y-8">
      <PageHeader title="Guidance" description="Claim a request to become the owner. There is no auto-assignment." />
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-500">Unclaimed</h2>
        {unclaimed.length === 0 ? (
          <Card>
            <EmptyState title="No unclaimed guidance requests." />
          </Card>
        ) : (
          unclaimed.map((row) => (
            <GuidanceQueueCard
              key={row.id}
              row={row}
              actorId={actor.id}
              unclaimed
              canRelease={false}
            />
          ))
        )}
      </section>
      {assigned.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">Assigned</h2>
          {assigned.map((row) => (
            <GuidanceQueueCard
              key={row.id}
              row={row}
              actorId={actor.id}
              unclaimed={false}
              canRelease={canCoordinatorReleaseGuidance(row, actor.id)}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function GuidanceQueueCard({
  row,
  actorId,
  unclaimed,
  canRelease,
}: {
  row: Awaited<ReturnType<typeof listGuidanceForCoordinator>>[number];
  actorId: string;
  unclaimed: boolean;
  canRelease: boolean;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-slate-900">{fullName(row.member)}</p>
          <p className="text-sm text-slate-600">{GUIDANCE_LABELS[row.category]}</p>
          <p className="text-sm text-slate-700">{previewText(row.message)}</p>
          <p className="text-sm text-slate-500">{formatDateTime(row.createdAt)}</p>
          <p className="text-sm text-slate-600">{guidanceAssignmentLabel(row, actorId)}</p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <Badge tone={guidanceStatusTone(row.status)}>{guidanceStatusLabel(row.status)}</Badge>
          <div className="flex flex-wrap items-center gap-2">
            {unclaimed ? <ClaimGuidanceButton requestId={row.id} /> : null}
            {canRelease ? <ReleaseGuidanceButton requestId={row.id} /> : null}
            <Link href={`/guidance/${row.id}`}>
              <Button size="sm" variant="secondary">
                Open
              </Button>
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
