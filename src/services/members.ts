import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export async function listMembers(query = "") {
  const term = query.trim();
  return prisma.member.findMany({
    where: term
      ? {
          OR: [
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 80,
  });
}

export async function getMember(id: string) {
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      registrations: { include: { event: true }, orderBy: { createdAt: "desc" } },
      checkIns: { include: { event: true } },
    },
  });
  if (!member) throw new AppError("Member not found.", 404);
  return member;
}

export async function updateMemberProfile(
  memberId: string,
  input: { phone?: string; emergencyName?: string; emergencyPhone?: string; emergencyRelation?: string },
) {
  return prisma.member.update({
    where: { id: memberId },
    data: {
      phone: input.phone || null,
      emergencyName: input.emergencyName || null,
      emergencyPhone: input.emergencyPhone || null,
      emergencyRelation: input.emergencyRelation || null,
    },
  });
}

export async function globalMemberSearch(query: string) {
  const term = query.trim();
  if (term.length < 2) return [];
  const rows = await prisma.member.findMany({
    where: {
      OR: [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ],
    },
    take: 8,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
    email: row.email,
    phone: row.phone,
  }));
}
