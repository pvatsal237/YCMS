import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { SessionUser } from "@/types";

export function maskPhone(phone: string | null | undefined) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `******${digits.slice(-4)}`;
}

export async function listMembers(q?: string) {
  return prisma.member.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 200,
  });
}

export async function getMember(id: string) {
  return prisma.member.findUnique({
    where: { id },
    include: {
      registrations: { include: { event: true }, orderBy: { createdAt: "desc" } },
      guidance: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function updateMemberProfile(
  user: SessionUser,
  input: {
    firstName: string;
    lastName: string;
    phone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  },
) {
  if (user.role !== "MEMBER" || !user.memberId) {
    throw new AppError("Only members can update this profile.", 403);
  }
  const member = await prisma.member.update({
    where: { id: user.memberId },
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim() || null,
      emergencyContactName: input.emergencyContactName?.trim() || null,
      emergencyContactPhone: input.emergencyContactPhone?.trim() || null,
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { name: `${member.firstName} ${member.lastName}`.trim() },
  });
  return member;
}

export async function searchMembersForCheckIn(eventId: string, q: string) {
  const query = q.trim();
  return prisma.eventRegistration.findMany({
    where: {
      eventId,
      status: "REGISTERED",
      member: query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
    },
    include: { member: true },
    orderBy: { member: { lastName: "asc" } },
    take: 40,
  });
}

export async function submitFeedback(
  user: SessionUser,
  eventId: string,
  rating: number,
  comment?: string,
) {
  if (user.role !== "MEMBER" || !user.memberId) throw new AppError("Only members can leave feedback.", 403);
  if (rating < 1 || rating > 5) throw new AppError("Please choose a rating from 1 to 5.", 400);
  return prisma.eventFeedback.upsert({
    where: { eventId_memberId: { eventId, memberId: user.memberId } },
    create: {
      eventId,
      memberId: user.memberId,
      userId: user.id,
      rating,
      comment: comment?.trim() || null,
    },
    update: { rating, comment: comment?.trim() || null },
  });
}
