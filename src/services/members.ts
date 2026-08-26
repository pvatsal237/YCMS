import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { normalizeEmail } from "@/lib/otp";
import { storePhone } from "@/lib/phone";
import type { SessionUser } from "@/types";

export { formatPhoneDisplay } from "@/lib/phone";

export const COORDINATOR_EMAIL_BLOCKED = "This email is registered as a Coordinator.";
export const DUPLICATE_MEMBER_EMAIL = "A member with this email already exists.";

export function evaluateMemberCreate(input: {
  existingMember: boolean;
  activeCoordinator: boolean;
  userRole?: "COORDINATOR" | "MEMBER" | null;
}): { ok: true } | { ok: false; error: string } {
  if (input.activeCoordinator || input.userRole === "COORDINATOR") {
    return { ok: false, error: COORDINATOR_EMAIL_BLOCKED };
  }
  if (input.existingMember) {
    return { ok: false, error: DUPLICATE_MEMBER_EMAIL };
  }
  return { ok: true };
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

export async function createMember(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}) {
  const email = normalizeEmail(input.email);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = storePhone(input.phone);
  const emergencyContactName = input.emergencyContactName?.trim() || null;
  const emergencyContactPhone = storePhone(input.emergencyContactPhone);

  const [existingMember, allow, existingUser] = await Promise.all([
    prisma.member.findUnique({ where: { email } }),
    prisma.coordinatorAllowlist.findFirst({ where: { email, active: true } }),
    prisma.user.findUnique({ where: { email } }),
  ]);

  const guard = evaluateMemberCreate({
    existingMember: Boolean(existingMember),
    activeCoordinator: Boolean(allow),
    userRole: existingUser?.role ?? null,
  });
  if (!guard.ok) {
    throw new AppError(guard.error, 409, "MEMBER_CREATE_BLOCKED");
  }

  try {
    const member = await prisma.member.create({
      data: {
        email,
        firstName,
        lastName,
        phone,
        emergencyContactName,
        emergencyContactPhone,
        active: true,
      },
    });

    if (existingUser?.role === "MEMBER" && !existingUser.memberId) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          memberId: member.id,
          name: `${firstName} ${lastName}`.trim(),
        },
      });
    }

    return member;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    if (code === "P2002") {
      throw new AppError(DUPLICATE_MEMBER_EMAIL, 409, "MEMBER_CREATE_BLOCKED");
    }
    throw error;
  }
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
      phone: storePhone(input.phone),
      emergencyContactName: input.emergencyContactName?.trim() || null,
      emergencyContactPhone: storePhone(input.emergencyContactPhone),
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
