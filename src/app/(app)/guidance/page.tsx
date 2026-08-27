import { requireCoordinator } from "@/lib/session";
import { listGuidanceForCoordinator } from "@/services/guidance";
import { guidanceQueueSections, isUnclaimedGuidance } from "@/lib/guidance-rules";
import { CoordinatorGuidanceCard } from "@/components/guidance/CoordinatorGuidanceCard";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { PageLoadError } from "@/components/ui/PageLoadError";
import { Card } from "@/components/ui/Card";
import { loadPageData } from "@/lib/page-data";

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
  const assignedToMe = rows.filter((row) => row.claimedById === actor.id);
  const assignedToOthers = rows.filter(
    (row) => !isUnclaimedGuidance(row) && row.claimedById !== actor.id,
  );
  const sections = guidanceQueueSections({
    assignedToMeCount: assignedToMe.length,
    unclaimedCount: unclaimed.length,
    assignedToOthersCount: assignedToOthers.length,
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Guidance" description="Claim a request to become the owner. There is no auto-assignment." />
      {sections.showEmptyState ? (
        <Card>
          <EmptyState
            title="No unclaimed guidance requests."
            description="New member guidance requests will appear here when submitted."
          />
        </Card>
      ) : null}
      {sections.showAssignedToMe ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">Your Assigned Requests</h2>
          {assignedToMe.map((row) => (
            <CoordinatorGuidanceCard key={row.id} request={row} actorId={actor.id} />
          ))}
        </section>
      ) : null}
      {sections.showUnclaimed ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">Unclaimed Requests</h2>
          {unclaimed.map((row) => (
            <CoordinatorGuidanceCard key={row.id} request={row} actorId={actor.id} />
          ))}
        </section>
      ) : null}
      {sections.showAssignedToOthers ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">Assigned to other coordinators</h2>
          {assignedToOthers.map((row) => (
            <CoordinatorGuidanceCard key={row.id} request={row} actorId={actor.id} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
