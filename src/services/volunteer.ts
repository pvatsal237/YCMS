import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { ensureVolunteerEnrollmentSchema } from "@/lib/volunteer-enrollment-schema";
import {
  createStaffNotification,
  deleteStaffingOpportunityNotifications,
} from "@/services/staff-notifications";
import { DEPARTMENT_TASK_TEMPLATES } from "@/utils/volunteer-templates";
import type { SessionUser } from "@/types";
import type { DepartmentPlanStatus, VolunteerDepartmentCode } from "@prisma/client";
import {
  KITCHEN_LEAD_SEATING_MESSAGE,
  SCHEDULE_CONFLICT_MESSAGE,
  assignmentFitsAvailability,
  kitchenLeadMembershipConflict,
  staffingShortage,
  utcDateKey,
  windowsOverlap,
  isLeadForDepartment,
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
  id?: string;
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
  await ensureVolunteerEnrollmentSchema();
  return prisma.volunteerDepartmentMembership.findMany({
    where: { userId },
    include: { department: true },
  });
}

export async function isTransportationAssignee(userId: string) {
  return Boolean(
    await prisma.volunteerDepartmentMembership.findFirst({
      where: { userId, department: { code: "TRANSPORTATION" } },
      select: { id: true },
    }),
  );
}

export async function isTransportationLead(userId: string) {
  return Boolean(
    await prisma.volunteerDepartmentMembership.findFirst({
      where: { userId, department: { code: "TRANSPORTATION" }, responsibility: "LEAD" },
      select: { id: true },
    }),
  );
}

export async function isDepartmentLead(userId: string, departmentId?: string) {
  const memberships = await prisma.volunteerDepartmentMembership.findMany({
    where: {
      userId,
      responsibility: "LEAD",
      ...(departmentId ? { departmentId } : {}),
    },
    select: { departmentId: true, responsibility: true },
  });
  if (!departmentId) return memberships.length > 0;
  return isLeadForDepartment(memberships, departmentId);
}

async function syncDepartmentPrimaryLead(departmentId: string) {
  const lead = await prisma.volunteerDepartmentMembership.findFirst({
    where: { departmentId, responsibility: "LEAD" },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });
  if (!lead) {
    throw new AppError("Every department must have at least one designated department lead.", 400);
  }
  await prisma.volunteerDepartment.update({
    where: { id: departmentId },
    data: { leadUserId: lead.userId },
  });
}

async function resolveDepartment(departmentId: string) {
  const byId = await prisma.volunteerDepartment.findUnique({ where: { id: departmentId } });
  if (byId) return byId;
  const code = departmentId.trim().toUpperCase().replace(/-/g, "_");
  return prisma.volunteerDepartment.findFirst({
    where: { code: code as VolunteerDepartmentCode },
  });
}

export async function listVolunteersForManage() {
  await ensureVolunteerEnrollmentSchema();
  try {
    return await prisma.user.findMany({
      where: { role: "ATTENDANCE_VOLUNTEER" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        volunteerMemberships: {
          select: {
            id: true,
            departmentId: true,
            responsibility: true,
            department: true,
          },
        },
      },
    });
  } catch {
    return [];
  }
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
  const previous = await prisma.volunteerDepartmentMembership.findMany({
    where: { userId: user.id },
    select: { departmentId: true },
  });
  const memberIds = [...new Set([...input.departmentIds, ...input.leadDepartmentIds])];
  await prisma.volunteerDepartmentMembership.deleteMany({ where: { userId: user.id } });
  for (const departmentId of memberIds) {
    await prisma.volunteerDepartmentMembership.create({
      data: {
        userId: user.id,
        departmentId,
        responsibility: input.leadDepartmentIds.includes(departmentId) ? "LEAD" : "VOLUNTEER",
      },
    });
  }
  const affected = [...new Set([...previous.map((row) => row.departmentId), ...memberIds])];
  for (const departmentId of affected) {
    await syncDepartmentPrimaryLead(departmentId);
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

async function volunteerHasTimeConflict(input: {
  userId: string;
  departmentId: string;
  requestDate: Date;
  startTime: string;
  endTime: string;
  exceptRequestId?: string;
}) {
  const target = toWindow(input.requestDate, input.startTime, input.endTime);
  const busy = [
    ...(await loadAssignmentWindows(input.userId, input.exceptRequestId)),
    ...(await loadLeadCommitmentWindows(input.userId, input.departmentId)),
  ];
  return busy.some((window) => windowsOverlap(window, target));
}

function nextDepartmentPlanStatus(
  actor: SessionUser,
  existing: { status: DepartmentPlanStatus } | null,
  submit: boolean,
): DepartmentPlanStatus {
  if (existing?.status === "CLOSED") {
    throw new AppError("This plan is locked after the event was completed.", 400);
  }
  if (actor.role === "ADMIN" || actor.role === "COORDINATOR") {
    if (submit) return "APPROVED";
    return existing?.status ?? "APPROVED";
  }
  if (submit) return "PENDING_APPROVAL";
  if (!existing || existing.status === "DRAFT") return "DRAFT";
  if (existing.status === "CHANGES_REQUESTED") return "CHANGES_REQUESTED";
  return "PENDING_APPROVAL";
}

function requestStatusForPlan(planStatus: DepartmentPlanStatus, needed: number, confirmed: number) {
  if (planStatus === "CLOSED") return "CLOSED" as const;
  if (planStatus === "APPROVED") return staffingShortage(needed, confirmed) > 0 ? ("APPROVED" as const) : ("FILLED" as const);
  if (planStatus === "PENDING_APPROVAL") return "PENDING_APPROVAL" as const;
  return "DRAFT" as const;
}

async function syncRequestFillStatus(requestId: string) {
  const request = await prisma.volunteerStaffingRequest.findUnique({
    where: { id: requestId },
    include: { assignments: true },
  });
  if (!request) return null;
  const confirmed = request.assignments.length;
  const liveOpen = staffingShortage(request.neededCount, confirmed) > 0;
  const canToggleFill = request.status === "APPROVED" || request.status === "FILLED";
  const next = canToggleFill ? (liveOpen ? "APPROVED" : "FILLED") : request.status;
  if (next !== request.status) {
    await prisma.volunteerStaffingRequest.update({
      where: { id: requestId },
      data: { status: next },
    });
  }
  await syncStaffingOpportunityNotifications(requestId);
  return { ...request, status: next, confirmed };
}

async function syncStaffingOpportunityNotifications(requestId: string) {
  const request = await prisma.volunteerStaffingRequest.findUnique({
    where: { id: requestId },
    include: {
      meetup: true,
      department: { include: { members: { include: { user: { select: { id: true, active: true } } } } } },
      assignments: true,
      responses: true,
    },
  });
  if (!request) return;
  const remaining = staffingShortage(request.neededCount, request.assignments.length);
  const assigned = new Set(request.assignments.map((row) => row.userId));
  if (request.status !== "APPROVED" && request.status !== "FILLED") {
    await deleteStaffingOpportunityNotifications(requestId);
    return;
  }
  if (remaining === 0) {
    await deleteStaffingOpportunityNotifications(requestId);
    return;
  }
  await deleteStaffingOpportunityNotifications(requestId);
  const declined = new Set(
    request.responses.filter((row) => row.status === "NOT_AVAILABLE").map((row) => row.userId),
  );
  const title = `${remaining} more volunteer${remaining === 1 ? "" : "s"} would be helpful for ${request.task}`;
  const message = [
    `Event: ${request.meetup.title}`,
    `Department: ${request.department.name}`,
    `Task: ${request.task}`,
    `Date: ${utcDateKey(request.requestDate)}`,
    `Start Time: ${request.startTime}`,
    `End Time: ${request.endTime}`,
    `Remaining Spots: ${remaining}`,
    request.notes ? `Notes: ${request.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  for (const member of request.department.members) {
    if (!member.user.active || assigned.has(member.userId) || declined.has(member.userId)) continue;
    if (
      await volunteerHasTimeConflict({
        userId: member.userId,
        departmentId: request.departmentId,
        requestDate: request.requestDate,
        startTime: request.startTime,
        endTime: request.endTime,
        exceptRequestId: request.id,
      })
    ) {
      continue;
    }
    await createStaffNotification({
      userId: member.userId,
      requestId: request.id,
      title,
      message,
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
    include: { staffingRequests: { include: { assignments: true } } },
  });
  if (existing?.status === "CLOSED") {
    throw new AppError("This plan is locked after the event was completed.", 400);
  }
  if (input.requirements.length === 0) {
    throw new AppError("Add at least one staffing requirement.", 400);
  }

  const status = nextDepartmentPlanStatus(actor, existing, input.submit);
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

  const keepIds = new Set(input.requirements.map((row) => row.id).filter(Boolean) as string[]);
  const existingIds = existing?.staffingRequests.map((row) => row.id) ?? [];
  const removeIds = existingIds.filter((id) => !keepIds.has(id));
  if (removeIds.length > 0) {
    await prisma.volunteerStaffingRequest.deleteMany({ where: { id: { in: removeIds } } });
  }

  for (const requirement of input.requirements) {
    const owned = requirement.id
      ? existing?.staffingRequests.find((row) => row.id === requirement.id)
      : undefined;
    const confirmed = owned?.assignments.length ?? 0;
    const requestStatus = requestStatusForPlan(status, requirement.neededCount, confirmed);
    const request = owned
      ? await prisma.volunteerStaffingRequest.update({
          where: { id: owned.id },
          data: {
            task: requirement.task.trim(),
            neededCount: requirement.neededCount,
            requestDate: requirement.requestDate,
            startTime: requirement.startTime,
            endTime: requirement.endTime,
            notes: requirement.notes || null,
            preAssignedUserId: requirement.preAssignedUserId || null,
            status: requestStatus,
          },
        })
      : await prisma.volunteerStaffingRequest.create({
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
            status: requestStatus,
          },
        });
    if (requirement.preAssignedUserId) {
      const already = owned?.assignments.some((row) => row.userId === requirement.preAssignedUserId);
      if (!already) {
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
    await syncRequestFillStatus(request.id);
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
    for (const request of plan.staffingRequests) {
      await syncRequestFillStatus(request.id);
    }
  } else {
    for (const request of plan.staffingRequests) {
      await deleteStaffingOpportunityNotifications(request.id);
    }
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
    await syncRequestFillStatus(request.id);
  } else {
    await deleteStaffingOpportunityNotifications(request.id);
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
    include: { assignments: true },
  });
  if (!request) throw new AppError("Request not found.", 404);
  const member = await prisma.volunteerDepartmentMembership.findFirst({
    where: { userId: actor.id, departmentId: request.departmentId },
  });
  if (!member) throw new AppError("You are not in this department.", 403);
  if (input.status === "PARTIAL" && (!input.startTime || !input.endTime)) {
    throw new AppError("Partial availability needs a start and end time.", 400);
  }
  const existingAssignment = request.assignments.find((row) => row.userId === actor.id);
  if (input.status === "NOT_AVAILABLE") {
    if (existingAssignment) {
      await prisma.volunteerAssignment.delete({ where: { id: existingAssignment.id } });
      const leads = await prisma.volunteerDepartmentMembership.findMany({
        where: { departmentId: request.departmentId, responsibility: "LEAD" },
        select: { userId: true },
      });
      await Promise.all(
        leads.map((lead) =>
          createStaffNotification({
            userId: lead.userId,
            requestId: request.id,
            title: "A volunteer stepped back",
            message: `Someone is no longer able to help with ${request.task}. The opportunity can be offered again.`,
          }),
        ),
      );
    }
    const response = await prisma.volunteerStaffingResponse.upsert({
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
    await syncRequestFillStatus(request.id);
    return response;
  }
  await assertNoScheduleConflict({
    userId: actor.id,
    departmentId: request.departmentId,
    requestDate: request.requestDate,
    startTime: request.startTime,
    endTime: request.endTime,
    exceptRequestId: request.id,
    availability: input,
  });
  const remaining = staffingShortage(request.neededCount, request.assignments.length);
  if (!existingAssignment && remaining <= 0) {
    throw new AppError("This requirement is already filled.", 400);
  }
  const response = await prisma.volunteerStaffingResponse.upsert({
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
  if (!existingAssignment) {
    await prisma.volunteerAssignment.create({ data: { requestId: request.id, userId: actor.id } });
    await createStaffNotification({
      userId: actor.id,
      requestId: request.id,
      title: "Volunteer assignment",
      message: `You were assigned to ${request.task}.`,
    });
  }
  await syncRequestFillStatus(request.id);
  return response;
}

export async function assignVolunteerToRequest(
  actor: SessionUser,
  requestId: string,
  userId: string,
) {
  const request = await prisma.volunteerStaffingRequest.findUnique({
    where: { id: requestId },
    include: { assignments: true, responses: true },
  });
  if (!request) throw new AppError("Request not found.", 404);
  const allowed =
    actor.role === "ADMIN" ||
    actor.role === "COORDINATOR" ||
    (await isDepartmentLead(actor.id, request.departmentId));
  if (!allowed) throw new AppError("You do not have permission to perform this action.", 403);
  if (request.assignments.some((row) => row.userId === userId)) return request;
  if (staffingShortage(request.neededCount, request.assignments.length) <= 0) {
    throw new AppError("This requirement is already filled.", 400);
  }
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
  await syncRequestFillStatus(requestId);
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
  const rows = await prisma.volunteerStaffingRequest.findMany({
    where: { status: { in: ["APPROVED", "FILLED"] }, departmentId: { in: ids } },
    include: {
      meetup: true,
      department: true,
      responses: { where: { userId } },
      assignments: true,
    },
    orderBy: { requestDate: "asc" },
  });
  const open = [];
  for (const request of rows) {
    const remaining = staffingShortage(request.neededCount, request.assignments.length);
    if (remaining <= 0) continue;
    if (request.assignments.some((row) => row.userId === userId)) continue;
    if (request.responses.some((row) => row.status === "NOT_AVAILABLE")) continue;
    if (
      await volunteerHasTimeConflict({
        userId,
        departmentId: request.departmentId,
        requestDate: request.requestDate,
        startTime: request.startTime,
        endTime: request.endTime,
        exceptRequestId: request.id,
      })
    ) {
      continue;
    }
    open.push({ ...request, remaining });
  }
  return open;
}

function summarizeRequests(
  requests: Array<{
    id: string;
    task: string;
    neededCount: number;
    status: string;
    requestDate: Date;
    startTime: string;
    endTime: string;
    notes: string | null;
    assignments: Array<{ user: { id: string; name: string; phone: string | null } }>;
    responses?: Array<{
      userId: string;
      status: string;
      startTime: string | null;
      endTime: string | null;
      note: string | null;
    }>;
  }>,
) {
  const tasks = requests.map((request) => {
    const confirmed = request.assignments.length;
    const remaining = staffingShortage(request.neededCount, confirmed);
    return {
      id: request.id,
      task: request.task,
      needed: request.neededCount,
      confirmed,
      remaining,
      fill: remaining > 0 ? "OPEN" : "FILLED",
      status: request.status,
      requestDate: request.requestDate,
      startTime: request.startTime,
      endTime: request.endTime,
      notes: request.notes,
      volunteers: request.assignments.map((row) => {
        const response = request.responses?.find((item) => item.userId === row.user.id);
        return {
          ...row.user,
          availability: response?.status ?? "AVAILABLE",
          availableStart: response?.startTime ?? null,
          availableEnd: response?.endTime ?? null,
          note: response?.note ?? null,
          assignmentStatus: "Confirmed",
          isNewVolunteer: false,
          teamNotes: null as string | null,
          recentAssignments: 0,
        };
      }),
    };
  });
  const needed = tasks.reduce((sum, row) => sum + row.needed, 0);
  const confirmed = tasks.reduce((sum, row) => sum + row.confirmed, 0);
  return { needed, confirmed, remaining: staffingShortage(needed, confirmed), tasks };
}

export async function getVolunteerHomeData(userId: string) {
  const memberships = await getVolunteerContext(userId);
  const ledDepartments = await prisma.volunteerDepartment.findMany({
    where: { members: { some: { userId, responsibility: "LEAD" } } },
  });
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
  for (const department of ledDepartments) {
    const plan = nextEvent
      ? await prisma.eventDepartmentPlan.findUnique({
          where: {
            meetupId_departmentId: { meetupId: nextEvent.id, departmentId: department.id },
          },
          include: {
            staffingRequests: {
              include: {
                assignments: { include: { user: { select: { id: true, name: true, phone: true } } } },
                responses: {
                  select: { userId: true, status: true, startTime: true, endTime: true, note: true },
                },
              },
            },
          },
        })
      : null;
    const summary = plan ? summarizeRequests(plan.staffingRequests) : { needed: 0, confirmed: 0, remaining: 0, tasks: [] };
    if (summary.tasks.length > 0) {
      const userIds = [...new Set(summary.tasks.flatMap((task) => task.volunteers.map((person) => person.id)))];
      const [team, recent] = await Promise.all([
        prisma.volunteerDepartmentMembership.findMany({
          where: { departmentId: department.id, userId: { in: userIds } },
          select: { userId: true, isNewVolunteer: true, notes: true },
        }),
        prisma.volunteerAssignment.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds } },
          _count: { _all: true },
        }),
      ]);
      const teamByUser = new Map(team.map((row) => [row.userId, row]));
      const recentByUser = new Map(recent.map((row) => [row.userId, row._count._all]));
      for (const task of summary.tasks) {
        for (const person of task.volunteers) {
          const row = teamByUser.get(person.id);
          Object.assign(person, {
            isNewVolunteer: row?.isNewVolunteer ?? false,
            teamNotes: row?.notes ?? null,
            recentAssignments: recentByUser.get(person.id) ?? 0,
          });
        }
      }
    }
    let transport = null;
    if (department.code === "TRANSPORTATION" && nextEvent) {
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
      department,
      event: nextEvent,
      plan,
      summary,
      transport,
      canEditPlan: true,
    });
  }

  const transportAvailability =
    nextEvent && memberships.some((row) => row.department.code === "TRANSPORTATION")
      ? await prisma.transportEventAvailability.findUnique({
          where: { userId_meetupId: { userId, meetupId: nextEvent.id } },
        })
      : null;

  return {
    memberships,
    upcomingEvents,
    assignments,
    openRequests,
    leadDashboards,
    nextEvent,
    transportAvailability,
  };
}

export async function getPlanEditorData(actor: SessionUser, meetupId: string, departmentKey: string) {
  const department = await resolveDepartment(departmentKey);
  if (!department) throw new AppError("Event or department not found.", 404);
  const canEdit =
    actor.role === "ADMIN" ||
    actor.role === "COORDINATOR" ||
    (actor.role === "ATTENDANCE_VOLUNTEER" && (await isDepartmentLead(actor.id, department.id)));
  if (!canEdit) {
    throw new AppError("Only a department lead can open this plan.", 403);
  }
  const [meetup, plan, members] = await Promise.all([
    prisma.meetup.findUnique({ where: { id: meetupId } }),
    prisma.eventDepartmentPlan.findUnique({
      where: { meetupId_departmentId: { meetupId, departmentId: department.id } },
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
      where: { departmentId: department.id },
      include: { user: { select: { id: true, name: true, phone: true, active: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  if (!meetup) throw new AppError("Event or department not found.", 404);
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
