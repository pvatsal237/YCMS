import Link from "next/link";
import { requireCoordinator } from "@/lib/session";
import { guidanceAssignmentLabel, listGuidanceForCoordinator } from "@/services/guidance";
import { claimGuidanceAction } from "@/actions/guidance";
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
  return (
    <div className="space-y-6">
      <PageHeader title="Guidance" description="Claim a request to become the owner. There is no auto-assignment." />
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No guidance requests yet."
            description="New member guidance requests will appear here when submitted."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const unclaimed = !row.claimedById && row.status === "NEW";
            const isOwner = row.claimedById === actor.id;
            return (
              <Card key={row.id}>
                <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-slate-900">{fullName(row.member)}</p>
                    <p className="text-sm text-slate-600">{GUIDANCE_LABELS[row.category]}</p>
                    <p className="text-sm text-slate-700">{previewText(row.message)}</p>
                    <p className="text-sm text-slate-500">{formatDateTime(row.createdAt)}</p>
                    <p className="text-sm text-slate-600">{guidanceAssignmentLabel(row, actor.id)}</p>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                    <Badge tone={guidanceStatusTone(row.status)}>{guidanceStatusLabel(row.status)}</Badge>
                    {unclaimed ? (
                      <form action={claimGuidanceAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <Button type="submit" size="sm">Claim Request</Button>
                      </form>
                    ) : null}
                    {isOwner || unclaimed ? (
                      <Link href={`/guidance/${row.id}`}>
                        <Button size="sm" variant="secondary">{isOwner ? "Open" : "View"}</Button>
                      </Link>
                    ) : (
                      <Link href={`/guidance/${row.id}`}>
                        <Button size="sm" variant="ghost">View</Button>
                      </Link>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
