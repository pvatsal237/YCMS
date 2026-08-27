export function canMemberCancelGuidance(
  request: { status: string; claimedById: string | null; memberId: string },
  memberId: string,
) {
  return request.memberId === memberId && request.status === "NEW" && !request.claimedById;
}
