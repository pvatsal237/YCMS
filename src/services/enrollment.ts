import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/lib/activity-log";
import { createStaffNotification } from "@/services/staff-notifications";
import { ensureVolunteerEnrollmentSchema } from "@/lib/volunteer-enrollment-schema";
import { departmentLabel } from "@/utils/format";
import type { SessionUser } from "@/types";
import type { VolunteerDepartmentCode, VolunteerInterestKind, VolunteerResponseStatus } from "@prisma/client";

export const SERVE_DEPARTMENT_CODES: VolunteerDepartmentCode[] = [
  "KITCHEN",
  "TRANSPORTATION",
  "SEATING_SETUP",
  "AUDIO_VIDEO",
  "RECREATION",
  "RISEUP_SUPPORT",
  "GENERAL_EVENT_SUPPORT",
];

export type EnrollmentInterestInput = {
  departmentCode?: VolunteerDepartmentCode | "";
  interestKind: VolunteerInterestKind;
  availability: VolunteerResponseStatus;
  availableFrom?: string;
  availableUntil?: string;
  notes?: string;
  isNewVolunteer?: boolean;
  canHelpWherever?: boolean;
  oneTime?: boolean;
};

export async function listDepartmentsForServe() {
  return prisma.volunteerDepartment.findMany({
    where: { code: { in: SERVE_DEPARTMENT_CODES } },
    orderBy: { name: "asc" },
  });
}

export async function listMemberEnrollments(memberId: string) {
  await ensureVolunteerEnrollmentSchema();
  return prisma.volunteerEnrollmentRequest.findMany({
    where: { memberId },
    include: { department: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listMemberVolunteerTeams(userId: string) {
  await ensureVolunteerEnrollmentSchema();
  return prisma.volunteerDepartmentMembership.findMany({
    where: { userId },
    include: { department: true },
    orderBy: { department: { name: "asc" } },
  });
}

export async function submitVolunteerInterests(actor: SessionUser, interests: EnrollmentInterestInput[]) {
  await ensureVolunteerEnrollmentSchema();
  if (actor.role !== "MEMBER") {
    throw new AppError("Please use the member portal to offer to serve.", 403);
  }
  const member = await prisma.member.findFirst({ where: { email: actor.email, active: true } });
  if (!member) throw new AppError("We could not find your member record.", 404);
  if (interests.length === 0) {
    throw new AppError("Please choose where you would enjoy serving.", 400);
  }

  const created = [];
  for (const interest of interests) {
    if (interest.availability === "PARTIAL" && (!interest.availableFrom || !interest.availableUntil)) {
      throw new AppError("Partial availability needs Available From and Available Until.", 400);
    }
    const department =
      interest.interestKind === "DEPARTMENT" && interest.departmentCode
        ? await prisma.volunteerDepartment.findUnique({ where: { code: interest.departmentCode } })
        : null;
    if (interest.interestKind === "DEPARTMENT" && !department) {
      throw new AppError("Please choose a department.", 400);
    }
    const duplicate = await prisma.volunteerEnrollmentRequest.findFirst({
      where: {
        memberId: member.id,
        status: "PENDING",
        interestKind: interest.interestKind,
        departmentId: department?.id ?? null,
      },
    });
    if (duplicate) continue;
    const alreadyMember =
      department &&
      (await prisma.volunteerDepartmentMembership.findFirst({
        where: { userId: actor.id, departmentId: department.id },
      }));
    if (alreadyMember) continue;

    const row = await prisma.volunteerEnrollmentRequest.create({
      data: {
        memberId: member.id,
        volunteerUserId: actor.id,
        departmentId: department?.id ?? null,
        interestKind: interest.interestKind,
        availability: interest.availability,
        availableFrom: interest.availableFrom || null,
        availableUntil: interest.availableUntil || null,
        notes: interest.notes?.trim() || null,
        isNewVolunteer: Boolean(interest.isNewVolunteer),
        canHelpWherever: Boolean(interest.canHelpWherever) || interest.interestKind === "WHEREVER",
        oneTime: Boolean(interest.oneTime),
      },
      include: { department: true },
    });
    created.push(row);
    await notifyEnrollmentReviewers(row.id);
  }

  await logActivity({
    userId: actor.id,
    action: "VOLUNTEER_ENROLLMENT_SUBMITTED",
    entityType: "VolunteerEnrollmentRequest",
    message: `${member.firstName} ${member.lastName} offered to serve.`,
  });
  if (created.length === 0) {
    throw new AppError("Thank you — that interest is already with the team for review, or you already serve there.", 400);
  }
  return created;
}

async function notifyEnrollmentReviewers(requestId: string) {
  const request = await prisma.volunteerEnrollmentRequest.findUnique({
    where: { id: requestId },
    include: { member: true, department: { include: { members: true } } },
  });
  if (!request) return;
  const leadIds = request.department
    ? request.department.members.filter((row) => row.responsibility === "LEAD").map((row) => row.userId)
    : [];
  const coordinators = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "COORDINATOR"] }, active: true },
    select: { id: true },
  });
  const title = "Someone would like to serve";
  const where =
    request.interestKind === "WHEREVER"
      ? "wherever needed"
      : request.interestKind === "UNSURE"
        ? "and is not sure where yet"
        : departmentLabel(request.department?.code ?? "");
  const message = `${request.member.firstName} ${request.member.lastName} would like to help with ${where}.`;
  const ids = request.interestKind === "DEPARTMENT" ? [...leadIds, ...coordinators.map((row) => row.id)] : coordinators.map((row) => row.id);
  await Promise.all(
    [...new Set(ids)].map((userId) =>
      createStaffNotification({
        userId,
        memberId: request.memberId,
        requestId: request.id,
        title,
        message,
      }),
    ),
  );
}

export async function listPendingEnrollments(actor: SessionUser) {
  await ensureVolunteerEnrollmentSchema();
  if (actor.role === "ADMIN" || actor.role === "COORDINATOR") {
    return prisma.volunteerEnrollmentRequest.findMany({
      where: { status: "PENDING" },
      include: { member: true, department: true },
      orderBy: { createdAt: "asc" },
    });
  }
  const leadMemberships = await prisma.volunteerDepartmentMembership.findMany({
    where: { userId: actor.id, responsibility: "LEAD" },
    select: { departmentId: true },
  });
  const ids = leadMemberships.map((row) => row.departmentId);
  if (ids.length === 0) return [];
  return prisma.volunteerEnrollmentRequest.findMany({
    where: { status: "PENDING", departmentId: { in: ids }, interestKind: "DEPARTMENT" },
    include: { member: true, department: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function reviewEnrollment(
  actor: SessionUser,
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  assignedDepartmentId?: string,
) {
  await ensureVolunteerEnrollmentSchema();
  const request = await prisma.volunteerEnrollmentRequest.findUnique({
    where: { id: requestId },
    include: { member: true, department: true },
  });
  if (!request || request.status !== "PENDING") {
    throw new AppError("This request is no longer waiting for review.", 404);
  }
  if (assignedDepartmentId && (actor.role === "ADMIN" || actor.role === "COORDINATOR")) {
    const department = await prisma.volunteerDepartment.findUnique({ where: { id: assignedDepartmentId } });
    if (!department) throw new AppError("Please choose a department.", 400);
    await prisma.volunteerEnrollmentRequest.update({
      where: { id: requestId },
      data: { departmentId: department.id, interestKind: "DEPARTMENT" },
    });
    request.departmentId = department.id;
    request.department = department;
    request.interestKind = "DEPARTMENT";
  }
  const canReview = actor.role === "ADMIN" || actor.role === "COORDINATOR";
  if (!canReview) {
    throw new AppError("A coordinator reviews serving requests and assigns the department.", 403);
  }
  if (decision === "APPROVED" && !request.departmentId) {
    throw new AppError("Please choose a department before welcoming this person to a team.", 400);
  }

  const volunteerUser =
    (await prisma.user.findFirst({ where: { memberId: request.memberId } })) ??
    (await prisma.user.findFirst({ where: { email: request.member.email } }));

  if (decision === "APPROVED" && request.departmentId) {
    if (!volunteerUser) {
      throw new AppError("This member needs a login before they can join a volunteer team.", 400);
    }
    await prisma.volunteerDepartmentMembership.upsert({
      where: { userId_departmentId: { userId: volunteerUser.id, departmentId: request.departmentId } },
      create: {
        userId: volunteerUser.id,
        departmentId: request.departmentId,
        responsibility: "VOLUNTEER",
        notes: request.notes,
        isNewVolunteer: request.isNewVolunteer,
        canHelpWherever: request.canHelpWherever,
        oneTime: request.oneTime,
      },
      update: {
        notes: request.notes,
        isNewVolunteer: request.isNewVolunteer,
        canHelpWherever: request.canHelpWherever,
        oneTime: request.oneTime,
      },
    });
    await createStaffNotification({
      userId: volunteerUser.id,
      memberId: request.memberId,
      requestId: request.id,
      title: "Welcome to the team",
      message: `You are now part of the ${request.department ? departmentLabel(request.department.code) : "volunteer"} volunteer team. Thank you for helping with this community.`,
    });
  } else if (decision === "REJECTED" && volunteerUser) {
    await createStaffNotification({
      userId: volunteerUser.id,
      memberId: request.memberId,
      requestId: request.id,
      title: "Serving request update",
      message: "Thank you for offering to help. This department is set for now — you are always welcome to offer again later.",
    });
  }

  const updated = await prisma.volunteerEnrollmentRequest.update({
    where: { id: requestId },
    data: {
      status: decision,
      reviewedAt: new Date(),
      reviewedById: actor.id,
      volunteerUserId: volunteerUser?.id ?? request.volunteerUserId,
    },
  });
  await logActivity({
    userId: actor.id,
    action: decision === "APPROVED" ? "VOLUNTEER_ENROLLMENT_APPROVED" : "VOLUNTEER_ENROLLMENT_REJECTED",
    entityType: "VolunteerEnrollmentRequest",
    entityId: requestId,
    message: `${request.member.firstName} ${request.member.lastName} enrollment ${decision.toLowerCase()}.`,
  });
  return updated;
}
