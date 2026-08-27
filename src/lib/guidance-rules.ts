export function canMemberCancelGuidance(
  request: { status: string; claimedById: string | null; memberId: string },
  memberId: string,
) {
  return request.memberId === memberId && request.status === "NEW" && !request.claimedById;
}

export function isUnclaimedGuidance(request: { status: string; claimedById: string | null }) {
  return request.status === "NEW" && !request.claimedById;
}

export function canCoordinatorReleaseGuidance(
  request: { claimedById: string | null; status: string },
  actorId: string,
) {
  return Boolean(request.claimedById) && request.claimedById === actorId && request.status !== "RESOLVED";
}

export function alreadyClaimedMessage(coordinatorName: string | null | undefined) {
  return `This request has already been claimed by ${coordinatorName || "another coordinator"}.`;
}

export function guidanceQueueSections(input: {
  assignedToMeCount: number;
  unclaimedCount: number;
  assignedToOthersCount?: number;
}) {
  const assignedToOthersCount = input.assignedToOthersCount ?? 0;
  const pageIsEmpty =
    input.assignedToMeCount === 0 && input.unclaimedCount === 0 && assignedToOthersCount === 0;
  return {
    showAssignedToMe: input.assignedToMeCount > 0,
    showUnclaimed: input.unclaimedCount > 0,
    showAssignedToOthers: assignedToOthersCount > 0,
    showEmptyState: pageIsEmpty,
  };
}
