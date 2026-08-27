import { requireCoordinator } from "@/lib/session";
import { listGuidanceForCoordinator } from "@/services/guidance";
import {
  guidanceQueueSections,
  isActiveAssignedGuidance,
  isResolvedGuidance,
  isUnclaimedGuidance,
} from "@/lib/guidance-rules";
import { guidanceDateRange, parseGuidanceReportFilters, sortGuidanceRows } from "@/lib/guidance-report";
import { CoordinatorGuidanceCard } from "@/components/guidance/CoordinatorGuidanceCard";
import { GuidanceFilterForm } from "@/components/guidance/GuidanceFilterForm";
import { GuidanceHistoryRow } from "@/components/guidance/GuidanceHistoryRow";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { PageLoadError } from "@/components/ui/PageLoadError";
import { Card, CardBody } from "@/components/ui/Card";
import { loadPageData } from "@/lib/page-data";
import { prisma } from "@/lib/prisma";
import { listCoordinatorEvents } from "@/services/events";

export default async function GuidancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireCoordinator();
  const params = await searchParams;
  const loaded = await loadPageData("guidance.page", async () => {
    const [rows, coordinators, events] = await Promise.all([
      listGuidanceForCoordinator(),
      prisma.user.findMany({ where: { role: "COORDINATOR", active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      listCoordinatorEvents(),
    ]);
    return { rows, coordinators, events };
  });
  if (!loaded.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="Guidance" description="Claim a request to become the owner. There is no auto-assignment." />
        <PageLoadError description="We could not load guidance requests. Please try again." />
      </div>
    );
  }

  const { rows, coordinators, events } = loaded.data;
  const filters = parseGuidanceReportFilters({
    ...params,
    status: params.status ?? "RESOLVED",
  });
  const { from, to } = guidanceDateRange(filters);
  const unclaimed = rows.filter(isUnclaimedGuidance);
  const assignedToMe = rows.filter((row) => isActiveAssignedGuidance(row, actor.id));
  const assignedToOthers = rows.filter(
    (row) =>
      !isUnclaimedGuidance(row) &&
      !isResolvedGuidance(row) &&
      row.claimedById &&
      row.claimedById !== actor.id,
  );
  const historySource = rows.filter((row) => {
    if (isUnclaimedGuidance(row) || isActiveAssignedGuidance(row, actor.id)) return false;
    if (assignedToOthers.some((other) => other.id === row.id)) return false;
    return true;
  });
  const history = sortGuidanceRows(
    historySource
      .filter((row) => {
        if (from && row.createdAt < from) return false;
        if (to && row.createdAt > to) return false;
        if (filters.category && row.category !== filters.category) return false;
        if (filters.status && row.status !== filters.status) return false;
        if (filters.coordinatorId && row.claimedById !== filters.coordinatorId) return false;
        if (filters.event === "none" && row.eventId) return false;
        if (filters.event !== "all" && filters.event !== "none" && row.eventId !== filters.event) return false;
        return true;
      })
      .map((row) => ({ ...row, claimedByName: row.claimedBy?.name ?? null })),
    filters.sort,
  );
  const sections = guidanceQueueSections({
    assignedToMeCount: assignedToMe.length,
    unclaimedCount: unclaimed.length,
    historyCount: history.length,
    assignedToOthersCount: assignedToOthers.length,
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Guidance" description="Claim a request to become the owner. There is no auto-assignment." />
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
      {sections.showUnclaimedEmpty ? (
        <Card>
          <EmptyState
            title="No unclaimed guidance requests."
            description="New member guidance requests will appear here when submitted."
          />
        </Card>
      ) : null}
      {sections.showAssignedToOthers ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">In progress with other coordinators</h2>
          {assignedToOthers.map((row) => (
            <CoordinatorGuidanceCard key={row.id} request={row} actorId={actor.id} />
          ))}
        </section>
      ) : null}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-500">Guidance History</h2>
        <GuidanceFilterForm
          action="/guidance"
          filters={filters}
          coordinators={coordinators}
          events={events}
          includeSort
        />
        {history.length === 0 ? (
          <Card>
            <EmptyState title="No guidance activity matches the selected filters." />
          </Card>
        ) : (
          <Card>
            <CardBody className="p-0">
              {history.map((row) => (
                <GuidanceHistoryRow key={row.id} request={row} />
              ))}
            </CardBody>
          </Card>
        )}
      </section>
    </div>
  );
}
