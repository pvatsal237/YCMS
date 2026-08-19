import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { createStaffNotification } from "@/services/staff-notifications";
import { DEPARTMENT_TASK_TEMPLATES } from "@/utils/volunteer-templates";
import type { SessionUser } from "@/types";
import type { DepartmentPlanStatus, VolunteerDepartmentCode } from "@prisma/client";
import {
  KITCHEN_LEAD_SEATING_MESSAGE,
  SCHEDULE_CONFLICT_MESSAGE,
  assignmentFitsAvailability,
  kitchenLeadMembershipConflict,
  utcDateKey,
  windowsOverlap,
  type ScheduleWindow,
} from "@/utils/volunteer-schedule";

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

export { DEPARTMENT_TASK_TEMPLATES };

export type KnownAssignment = { label: string; userId: string };

export type StaffingRequirementInput = {
  task: string;
  neededCount: number;
  requestDate: Date;
  startTime: string;
  endTime: string;
  notes?: string;
  preAssignedUserId?: string;
};

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
  const selectedIds = [...new Set([...input.departmentIds, ...input.leadDepartmentIds])];
  const selected = await prisma.volunteerDepartment.findMany({
    where: { id: { in: selectedIds } },
    select: { id: true, code: true },
  });
  const memberCodes = selected.filter((row) => input.departmentIds.includes(row.id)).map((row) => row.code);
  const leadCodes = selected.filter((row) => input.leadDepartmentIds.includes(row.id)).map((row) => row.code);
  const conflict = kitchenLeadMembershipConflict(leadCodes, memberCodes);
  if (conflict) throw new AppError(conflict, 400);
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
    await prisma.volunteerDepartmentMembership.updateMany({
      where: { departmentId, userId: { not: user.id }, responsibility: "LEAD" },
      data: { responsibility: "VOLUNTEER" },
    });
    await prisma.volunteerDepartment.update({
      where: { id: departmentId },
      data: { leadUserId: user.id },
    });
  }
}

function toWindow(date: Date, startTime: string, endTime: string): ScheduleWindow {
  return { dateKey: utcDateKey(date), startTime, endTime };
}

async function loadAssignmentWindows(userId: string, exceptRequestId?: string): Promise<ScheduleWindow[]> {
  const assignments = await prisma.volunteerAssignment.findMany({
    where: { userId, ...(exceptRequestId ? { requestId: { not: exceptRequestId } } : {}) },
    include: { request: true },
  });
  const rides = await prisma.rideRequest.findMany({
    where: { driverUserId: userId, status: { in: ["ASSIGNED", "APPROVED"] } },
    include: { meetup: true },
  });
  return [
    ...assignments.map((row) => toWindow(row.request.requestDate, row.request.startTime, row.request.endTime)),
    ...rides.map((row) =>
      toWindow(row.meetup.meetupDate, row.meetup.startTime || "20:00", row.meetup.endTime || "22:00"),
    ),
  ];
}

async function loadLeadCommitmentWindows(userId: string, exceptDepartmentId?: string): Promise<ScheduleWindow[]> {
  const leadMemberships = await prisma.volunteerDepartmentMembership.findMany({
    where: { userId, responsibility: "LEAD" },
    include: { department: true },
  });
  const relevant = leadMemberships.filter((row) => row.departmentId !== exceptDepartmentId);
  if (relevant.length === 0) return [];
  const departmentIds = relevant.map((row) => row.departmentId);
  const requests = await prisma.volunteerStaffingRequest.findMany({
    where: {
      departmentId: { in: departmentIds },
      status: { notIn: ["REJECTED", "CLOSED"] },
    },
    include: { meetup: true },
  });
  const windows = requests.map((row) => toWindow(row.requestDate, row.startTime, row.endTime));
  const kitchenLead = relevant.some((row) => row.department.code === "KITCHEN");
  if (kitchenLead) {
    const meetups = new Map(requests.map((row) => [row.meetup.id, row.meetup]));
    const plans = await prisma.eventDepartmentPlan.findMany({
      where: { department: { code: "KITCHEN" }, status: { not: "CLOSED" } },
      include: { meetup: true },
    });
    for (const plan of plans) meetups.set(plan.meetup.id, plan.meetup);
    for (const meetup of meetups.values()) {
      windows.push(toWindow(meetup.meetupDate, "15:00", meetup.endTime || "22:00"));
    }
  }
  return windows;
}

async function assertKitchenLeadNotSeating(userId: string, departmentId: string) {
  const [target, kitchenLead] = await Promise.all([
    prisma.volunteerDepartment.findUnique({ where: { id: departmentId }, select: { code: true } }),
    prisma.volunteerDepartmentMembership.findFirst({
      where: { userId, responsibility: "LEAD", department: { code: "KITCHEN" } },
    }),
  ]);
  if (kitchenLead && target?.code === "SEATING_SETUP") {
    throw new AppError(KITCHEN_LEAD_SEATING_MESSAGE, 400);
  }
}

async function assertNoScheduleConflict(input: {
  userId: string;
  departmentId: string;
  requestDate: Date;
  startTime: string;
  endTime: string;
  exceptRequestId?: string;
  availability?: { status: "AVAILABLE" | "PARTIAL" | "NOT_AVAILABLE"; startTime?: string | null; endTime?: string | null };
}) {
  if (input.availability?.status === "NOT_AVAILABLE") {
    throw new AppError("This volunteer is not available for this task.", 400);
  }
  await assertKitchenLeadNotSeating(input.userId, input.departmentId);
  if (input.availability?.status === "PARTIAL") {
    if (!input.availability.startTime || !input.availability.endTime) {
      throw new AppError("Partial availability needs a start and end time.", 400);
    }
    if (
      !assignmentFitsAvailability(
        input.startTime,
        input.endTime,
        input.availability.startTime,
        input.availability.endTime,
      )
    ) {
      throw new AppError("This assignment does not fit inside the volunteer’s available time window.", 400);
    }
  }
  const target = toWindow(input.requestDate, input.startTime, input.endTime);
  const busy = [
    ...(await loadAssignmentWindows(input.userId, input.exceptRequestId)),
    ...(await loadLeadCommitmentWindows(input.userId, input.departmentId)),
  ];
  if (busy.some((window) => windowsOverlap(window, target))) {
    throw new AppError(SCHEDULE_CONFLICT_MESSAGE, 400);
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
      status: actor.role === "ADMIN" || actor.role === "COORDINATOR" ? "APPROVED" : "DRAFT",
    },
  });
}

export async function saveDepartmentPlan(
  actor: SessionUser,
  input: {
    meetupId: string;
    departmentId: string;
    submit: boolean;
    cuisine?: string;
    sponsorName?: string;
    preparationLocation?: string;
    kitchenNotes?: string;
    knownAssignments: KnownAssignment[];
    requirements: StaffingRequirementInput[];
  },
) {
  const lead = await isDepartmentLead(actor.id, input.departmentId);
  if (!lead && actor.role !== "ADMIN" && actor.role !== "COORDINATOR") {
    throw new AppError("Only a department lead or coordinator can plan this department.", 403);
  }
  const existing = await prisma.eventDepartmentPlan.findUnique({
    where: { meetupId_departmentId: { meetupId: input.meetupId, departmentId: input.departmentId } },
  });
  if (existing && !["DRAFT", "CHANGES_REQUESTED"].includes(existing.status) && actor.role === "ATTENDANCE_VOLUNTEER") {
    throw new AppError("This plan is already submitted for review.", 400);
  }
  if (input.requirements.length === 0) {
    throw new AppError("Add at least one staffing requirement.", 400);
  }

  const status: DepartmentPlanStatus = input.submit ? "PENDING_APPROVAL" : "DRAFT";
  const plan = existing
    ? await prisma.eventDepartmentPlan.update({
        where: { id: existing.id },
        data: {
          status,
          cuisine: input.cuisine || null,
          sponsorName: input.sponsorName || null,
          preparationLocation: input.preparationLocation || null,
          kitchenNotes: input.kitchenNotes || null,
          knownAssignments: input.knownAssignments,
          submittedAt: input.submit ? new Date() : existing.submittedAt,
          reviewNote: input.submit ? null : existing.reviewNote,
        },
      })
    : await prisma.eventDepartmentPlan.create({
        data: {
          meetupId: input.meetupId,
          departmentId: input.departmentId,
          createdById: actor.id,
          status,
          cuisine: input.cuisine || null,
          sponsorName: input.sponsorName || null,
          preparationLocation: input.preparationLocation || null,
          kitchenNotes: input.kitchenNotes || null,
          knownAssignments: input.knownAssignments,
          submittedAt: input.submit ? new Date() : null,
        },
      });

  await prisma.volunteerAssignment.deleteMany({
    where: { request: { planId: plan.id } },
  });
  await prisma.volunteerStaffingRequest.deleteMany({ where: { planId: plan.id } });

  for (const requirement of input.requirements) {
    const request = await prisma.volunteerStaffingRequest.create({
      data: {
        meetupId: input.meetupId,
        departmentId: input.departmentId,
        planId: plan.id,
        task: requirement.task.trim(),
        neededCount: requirement.neededCount,
        requestDate: requirement.requestDate,
        startTime: requirement.startTime,
        endTime: requirement.endTime,
        notes: requirement.notes || null,
        createdById: actor.id,
        preAssignedUserId: requirement.preAssignedUserId || null,
        status: input.submit ? "PENDING_APPROVAL" : "DRAFT",
      },
    });
    if (requirement.preAssignedUserId) {
      await assertNoScheduleConflict({
        userId: requirement.preAssignedUserId,
        departmentId: input.departmentId,
        requestDate: requirement.requestDate,
        startTime: requirement.startTime,
        endTime: requirement.endTime,
        exceptRequestId: request.id,
      });
      await prisma.volunteerAssignment.create({
        data: { requestId: request.id, userId: requirement.preAssignedUserId },
      });
    }
  }
  return plan;
}

export async function reviewDepartmentPlan(
  actor: SessionUser,
  planId: string,
  decision: "APPROVED" | "CHANGES_REQUESTED" | "CLOSED",
  reviewNote?: string,
) {
  if (actor.role !== "ADMIN" && actor.role !== "COORDINATOR") {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
  const plan = await prisma.eventDepartmentPlan.update({
    where: { id: planId },
    data: {
      status: decision,
      reviewNote: reviewNote || null,
      reviewedAt: new Date(),
      reviewedById: actor.id,
    },
    include: {
      department: { include: { members: true } },
      staffingRequests: true,
      meetup: true,
    },
  });
  const requestStatus =
    decision === "APPROVED" ? "APPROVED" : decision === "CLOSED" ? "CLOSED" : "DRAFT";
  await prisma.volunteerStaffingRequest.updateMany({
    where: { planId },
    data: { status: requestStatus },
  });
  if (decision === "APPROVED") {
    await Promise.all(
      plan.department.members.map((member) =>
        createStaffNotification({
          userId: member.userId,
          requestId: plan.id,
          title: "New volunteer opportunity",
          message: `${plan.department.name} needs volunteers for ${plan.meetup.title}.`,
        }),
      ),
    );
  }
  return plan;
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
    where: { id: input.requestId, status: { in: ["APPROVED", "FILLED"] } },
  });
  if (!request) throw new AppError("Request not found.", 404);
  const member = await prisma.volunteerDepartmentMembership.findFirst({
    where: { userId: actor.id, departmentId: request.departmentId },
  });
  if (!member) throw new AppError("You are not in this department.", 403);
  if (input.status === "PARTIAL" && (!input.startTime || !input.endTime)) {
    throw new AppError("Partial availability needs a start and end time.", 400);
  }
  if (input.status !== "NOT_AVAILABLE") {
    await assertNoScheduleConflict({
      userId: actor.id,
      departmentId: request.departmentId,
      requestDate: request.requestDate,
      startTime: input.status === "PARTIAL" ? input.startTime! : request.startTime,
      endTime: input.status === "PARTIAL" ? input.endTime! : request.endTime,
      exceptRequestId: request.id,
      availability: input,
    });
  }
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
    include: { assignments: true, responses: true },
  });
  if (!request) throw new AppError("Request not found.", 404);
  if (request.assignments.some((row) => row.userId === userId)) return request;
  const response = request.responses.find((row) => row.userId === userId);
  await assertNoScheduleConflict({
    userId,
    departmentId: request.departmentId,
    requestDate: request.requestDate,
    startTime: request.startTime,
    endTime: request.endTime,
    exceptRequestId: request.id,
    availability: response
      ? {
          status: response.status,
          startTime: response.startTime,
          endTime: response.endTime,
        }
      : undefined,
  });
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

export async function assertRideAcceptAllowed(userId: string, meetup: { meetupDate: Date; startTime: string | null; endTime: string | null }) {
  const membership = await prisma.volunteerDepartmentMembership.findFirst({
    where: { userId, department: { code: "TRANSPORTATION" } },
  });
  await assertNoScheduleConflict({
    userId,
    departmentId: membership?.departmentId ?? "transport",
    requestDate: meetup.meetupDate,
    startTime: meetup.startTime || "20:00",
    endTime: meetup.endTime || "22:00",
  });
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

function summarizeRequests(
  requests: Array<{
    id: string;
    task: string;
    neededCount: number;
    assignments: Array<{ user: { id: string; name: string; phone: string | null } }>;
  }>,
) {
  const tasks = requests.map((request) => ({
    id: request.id,
    task: request.task,
    needed: request.neededCount,
    confirmed: request.assignments.length,
    remaining: Math.max(0, request.neededCount - request.assignments.length),
    volunteers: request.assignments.map((row) => row.user),
  }));
  const needed = tasks.reduce((sum, row) => sum + row.needed, 0);
  const confirmed = tasks.reduce((sum, row) => sum + row.confirmed, 0);
  return { needed, confirmed, remaining: Math.max(0, needed - confirmed), tasks };
}

export async function getVolunteerHomeData(userId: string) {
  const memberships = await getVolunteerContext(userId);
  const leadMemberships = memberships.filter((row) => row.responsibility === "LEAD");
  const upcomingEvents = await prisma.meetup.findMany({
    where: { active: true, meetupDate: { gte: new Date() } },
    orderBy: { meetupDate: "asc" },
    take: 6,
  });
  const nextEvent = upcomingEvents[0] ?? null;
  const assignments = await prisma.volunteerAssignment.findMany({
    where: { userId },
    include: { request: { include: { meetup: true, department: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const openRequests = await listOpenStaffingForVolunteer(userId);

  const leadDashboards = [];
  for (const membership of leadMemberships) {
    const plan = nextEvent
      ? await prisma.eventDepartmentPlan.findUnique({
          where: {
            meetupId_departmentId: { meetupId: nextEvent.id, departmentId: membership.departmentId },
          },
          include: {
            staffingRequests: {
              include: {
                assignments: { include: { user: { select: { id: true, name: true, phone: true } } } },
              },
            },
          },
        })
      : null;
    const summary = plan ? summarizeRequests(plan.staffingRequests) : { needed: 0, confirmed: 0, remaining: 0, tasks: [] };
    let transport = null;
    if (membership.department.code === "TRANSPORTATION" && nextEvent) {
      const rides = await prisma.rideRequest.findMany({
        where: { meetupId: nextEvent.id },
        select: { pickupArea: true, status: true, driverUserId: true },
      });
      const drivers = await prisma.user.findMany({
        where: {
          active: true,
          volunteerMemberships: { some: { department: { code: "TRANSPORTATION" } } },
        },
        select: { id: true, name: true, phone: true },
        orderBy: { name: "asc" },
      });
      transport = {
        total: rides.length,
        assigned: rides.filter((row) => row.driverUserId).length,
        unassigned: rides.filter((row) => !row.driverUserId).length,
        pickupAreas: [...new Set(rides.map((row) => row.pickupArea))],
        drivers,
      };
    }
    leadDashboards.push({
      department: membership.department,
      event: nextEvent,
      plan,
      summary,
      transport,
    });
  }

  return { memberships, upcomingEvents, assignments, openRequests, leadDashboards, nextEvent };
}

export async function getPlanEditorData(userId: string, meetupId: string, departmentId: string) {
  const lead = await isDepartmentLead(userId, departmentId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!lead && user?.role !== "ADMIN" && user?.role !== "COORDINATOR") {
    throw new AppError("Only a department lead can open this plan.", 403);
  }
  const [meetup, department, plan, members] = await Promise.all([
    prisma.meetup.findUnique({ where: { id: meetupId } }),
    prisma.volunteerDepartment.findUnique({ where: { id: departmentId } }),
    prisma.eventDepartmentPlan.findUnique({
      where: { meetupId_departmentId: { meetupId, departmentId } },
      include: {
        staffingRequests: {
          include: {
            assignments: { include: { user: { select: { id: true, name: true, phone: true } } } },
            preAssignedUser: { select: { id: true, name: true } },
          },
          orderBy: { startTime: "asc" },
        },
      },
    }),
    prisma.volunteerDepartmentMembership.findMany({
      where: { departmentId },
      include: { user: { select: { id: true, name: true, phone: true, active: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  if (!meetup || !department) throw new AppError("Event or department not found.", 404);
  return { meetup, department, plan, members };
}

export async function listPendingStaffingForReview() {
  return prisma.volunteerStaffingRequest.findMany({
    where: { status: "PENDING_APPROVAL", planId: null },
    include: { meetup: true, department: true, createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listPendingPlansForReview() {
  return prisma.eventDepartmentPlan.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: {
      meetup: true,
      department: true,
      createdBy: { select: { name: true } },
      staffingRequests: true,
    },
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
