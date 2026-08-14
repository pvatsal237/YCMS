"use server";

import { requireRoleAction } from "@/lib/session";
import { searchMembers } from "@/services/members";
import { fullName, immigrationStatusLabel, educationSummary, employmentSummary } from "@/utils/format";

export async function globalMemberSearchAction(query: string) {
  await requireRoleAction(["ADMIN", "COORDINATOR"]);
  if (!query.trim()) return [];
  const members = await searchMembers(query, 10);
  return members.map((member) => ({
    id: member.id,
    name: fullName(member),
    email: member.email,
    phone: member.phone,
    immigration: member.immigrationStatus
      ? immigrationStatusLabel(member.immigrationStatus.status)
      : "—",
    education: educationSummary(member.education),
    employment: employmentSummary(member.employment),
  }));
}
