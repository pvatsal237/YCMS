import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { createStaffNotification } from "@/services/staff-notifications";
import type { SessionUser } from "@/types";
import type { VolunteerDepartmentCode } from "@prisma/client";

export async function listDepartments() {
  return prisma.volunteerDepartment.findMany({
    orderBy: { name: "asc" },
    include: {
      lead: { select: { id: true, name: true, phone: true } },
      members: { include: { user: { select: { id: true, name: true, phone: true, active: true } } } },
    },
  });
}

export async function getVolunteerContext(userId: string) {
  return prisma.volunteerDepartmentMembership.findMany({
    where: { userId },
    include: { department: true },
  });
}

export async function isDepartmentLead(userId: string, departmentId?: string) {
  const where = departmentId
    ? { userId, departmentId, responsibility: "LEAD" as const }
    : { userId, responsibility: "LEAD" as const };
  const row = await prisma.volunteerDepartmentMembership.findFirst({ where });
  return Boolean(row);
}

export async function listVolunteersForManage() {
  return prisma.user.findMany({
    where: { role: "ATTENDANCE_VOLUNTEER" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      active: true,
      volunteerMemberships: { include: { department: true } },
    },
  });
}

export async function assignVolunteerDepartments(
  actor: SessionUser,
  input: {
    userId: string;
    departmentIds: string[];
    leadDepartmentIds: string[];
    phone?: string;
    active?: boolean;
  },
) {
  if (actor.role !== "ADMIN" && actor.role !== "COORDINATOR") {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
  const user = await prisma.user.findFirst({
    where: { id: input.userId, role: "ATTENDANCE_VOLUNTEER" },
  });
  if (!user) throw new AppError("Volunteer not found.", 404);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      phone: input.phone ?? user.phone,
      active: input.active ?? user.active,
    },
  });
  await prisma.volunteerDepartmentMembership.deleteMany({ where: { userId: user.id } });
  for (const departmentId of input.departmentIds) {
    await prisma.volunteerDepartmentMembership.create({
      data: {
        userId: user.id,
        departmentId,
        responsibility: input.leadDepartmentIds.includes(departmentId) ? "LEAD" : "VOLUNTEER",
      },
    });
  }
  for (const departmentId of input.leadDepartmentIds) {
    await prisma.volunteerDepartment.update({
      where: { id: departmentId },
      data: { leadUserId: user.id },
    });
  }
}

export async function createStaffingRequest(
  actor: SessionUser,
  input: {
    meetupId: string;
    departmentId: string;
    task: string;
    neededCount: number;
    requestDate: Date;
    startTime: string;
    endTime: string;
    notes?: string;
  },
) {
  const lead = await isDepartmentLead(actor.id, input.departmentId);
  if (!lead && actor.role !== "ADMIN" && actor.role !== "COORDINATOR") {
    throw new AppError("Only a department lead or coordinator can create this request.", 403);
  }
  return prisma.volunteerStaffingRequest.create({
    data: {
      ...input,
      notes: input.notes || null,
      createdById: actor.id,
      status: actor.role === "ADMIN" || actor.role === "COORDINATOR" ? "APPROVED" : "PENDING_APPROVAL",
    },
  });
}

export async function reviewStaffingRequest(
  actor: SessionUser,
  requestId: string,
  status: "APPROVED" | "REJECTED",
) {
  if (actor.role !== "ADMIN" && actor.role !== "COORDINATOR") {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
  const request = await prisma.volunteerStaffingRequest.update({
    where: { id: requestId },
    data: { status },
    include: { department: { include: { members: true } } },
  });
  if (status === "APPROVED") {
    await Promise.all(
      request.department.members.map((member) =>
        createStaffNotification({
          userId: member.userId,
          requestId: request.id,
          title: "New volunteer opportunity",
          message: `${request.task} needs ${request.neededCount} volunteers.`,
        }),
      ),
    );
  }
  return request;
}

export async function respondToStaffingRequest(
  actor: SessionUser,
  input: {
    requestId: string;
    status: "AVAILABLE" | "PARTIAL" | "NOT_AVAILABLE";
    startTime?: string;
    endTime?: string;
    note?: string;
  },
) {
  const request = await prisma.volunteerStaffingRequest.findFirst({
    where: { id: input.requestId, status: "APPROVED" },
  });
  if (!request) throw new AppError("Request not found.", 404);
  const member = await prisma.volunteerDepartmentMembership.findFirst({
    where: { userId: actor.id, departmentId: request.departmentId },
  });
  if (!member) throw new AppError("You are not in this department.", 403);
  return prisma.volunteerStaffingResponse.upsert({
    where: { requestId_userId: { requestId: input.requestId, userId: actor.id } },
    create: {
      requestId: input.requestId,
      userId: actor.id,
      status: input.status,
      startTime: input.startTime,
      endTime: input.endTime,
      note: input.note,
    },
    update: {
      status: input.status,
      startTime: input.startTime,
      endTime: input.endTime,
      note: input.note,
    },
  });
}

export async function assignVolunteerToRequest(
  actor: SessionUser,
  requestId: string,
  userId: string,
) {
  const lead = actor.role === "ADMIN" || actor.role === "COORDINATOR" || (await isDepartmentLead(actor.id));
  if (!lead) throw new AppError("You do not have permission to perform this action.", 403);
  const request = await prisma.volunteerStaffingRequest.findUnique({
    where: { id: requestId },
    include: { assignments: true },
  });
  if (!request) throw new AppError("Request not found.", 404);
  if (request.assignments.some((row) => row.userId === userId)) return request;
  await prisma.volunteerAssignment.create({ data: { requestId, userId } });
  await createStaffNotification({
    userId,
    requestId,
    title: "Volunteer assignment",
    message: `You were assigned to ${request.task}.`,
  });
  const count = request.assignments.length + 1;
  if (count >= request.neededCount) {
    await prisma.volunteerStaffingRequest.update({
      where: { id: requestId },
      data: { status: "FILLED" },
    });
  }
  return request;
}

export async function listOpenStaffingForVolunteer(userId: string) {
  const memberships = await prisma.volunteerDepartmentMembership.findMany({
    where: { userId },
    select: { departmentId: true },
  });
  const ids = memberships.map((row) => row.departmentId);
  return prisma.volunteerStaffingRequest.findMany({
    where: { status: "APPROVED", departmentId: { in: ids } },
    include: {
      meetup: true,
      department: true,
      responses: { where: { userId } },
      assignments: true,
    },
    orderBy: { requestDate: "asc" },
  });
}

export async function getVolunteerHomeData(userId: string) {
  const memberships = await getVolunteerContext(userId);
  const upcomingEvents = await prisma.meetup.findMany({
    where: { active: true, meetupDate: { gte: new Date() } },
    orderBy: { meetupDate: "asc" },
    take: 6,
  });
  const assignments = await prisma.volunteerAssignment.findMany({
    where: { userId },
    include: { request: { include: { meetup: true, department: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const openRequests = await listOpenStaffingForVolunteer(userId);
  return { memberships, upcomingEvents, assignments, openRequests };
}

export async function listPendingStaffingForReview() {
  return prisma.volunteerStaffingRequest.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: { meetup: true, department: true, createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getStaffingRequestDetail(id: string) {
  return prisma.volunteerStaffingRequest.findUnique({
    where: { id },
    include: {
      meetup: true,
      department: true,
      responses: { include: { user: { select: { id: true, name: true, phone: true } } } },
      assignments: { include: { user: { select: { id: true, name: true, phone: true } } } },
    },
  });
}

export const DEPARTMENT_CODES: Array<{ code: VolunteerDepartmentCode; name: string }> = [
  { code: "KITCHEN", name: "Kitchen / Food Preparation" },
  { code: "GROCERIES", name: "Groceries" },
  { code: "TRANSPORTATION", name: "Transportation" },
  { code: "SEATING_SETUP", name: "Seating & Setup" },
  { code: "AUDIO_VIDEO", name: "Audio / Video" },
  { code: "RECREATION", name: "Recreation" },
  { code: "RISEUP_SUPPORT", name: "RiseUp Event Support" },
  { code: "GENERAL_EVENT_SUPPORT", name: "General Event Support" },
];