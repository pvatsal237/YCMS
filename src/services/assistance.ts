import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { sendEmail } from "@/lib/email";
import { parseDateOnly } from "@/lib/dates";
import { createStaffNotification } from "@/services/staff-notifications";
import { getAlertPresentation } from "@/utils/immigration-alerts";
import { assistanceCategoryLabel, documentTypeLabel, fullName } from "@/utils/format";
import type { SessionUser } from "@/types";
import type {
  CreateAssistanceRequestInput,
  UpdateAssistanceRequestInput,
} from "@/validations/assistance";
import type { AssistanceCategory, AssistanceStatus, UserRole } from "@prisma/client";

export function isEligibleImmigrationDocument(expiryDate: Date) {
  return getAlertPresentation(expiryDate).level !== "VALID";
}

export function assistanceListWhere(actor: SessionUser): Prisma.AssistanceRequestWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "COORDINATOR") {
    return {
      OR: [
        { requestedRole: "COORDINATOR" },
        { requestedUserId: actor.id },
        { assignedToId: actor.id },
      ],
    };
  }
  return { id: "__none__" };
}

export function canManageAssistance(actor: SessionUser) {
  return actor.role === "ADMIN" || actor.role === "COORDINATOR";
}

const requestInclude = {
  member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  document: { select: { id: true, documentType: true, expiryDate: true } },
  requestedUser: { select: { id: true, name: true, role: true } },
  assignedTo: { select: { id: true, name: true, role: true } },
  updates: {
    orderBy: { createdAt: "desc" as const },
    include: { createdBy: { select: { id: true, name: true } } },
  },
};

export async function listStaffContactsByRole(role: "ADMIN" | "COORDINATOR") {
  return prisma.user.findMany({
    where: { active: true, role },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function listMemberAssistanceRequests(memberId: string) {
  return prisma.assistanceRequest.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: {
      document: { select: { documentType: true, expiryDate: true } },
      requestedUser: { select: { name: true, role: true } },
      assignedTo: { select: { name: true } },
    },
  });
}

export async function listAssistanceRequests(
  actor: SessionUser,
  filters: {
    status?: AssistanceStatus;
    requestedRole?: "ADMIN" | "COORDINATOR";
    urgency?: "LOW" | "MEDIUM" | "HIGH";
    category?: AssistanceCategory;
  },
) {
  if (!canManageAssistance(actor)) {
    throw new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN");
  }
  return prisma.assistanceRequest.findMany({
    where: {
      AND: [
        assistanceListWhere(actor),
        filters.status ? { status: filters.status } : {},
        filters.requestedRole ? { requestedRole: filters.requestedRole } : {},
        filters.urgency ? { urgency: filters.urgency } : {},
        filters.category ? { category: filters.category } : {},
      ],
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
    include: {
      member: { select: { id: true, firstName: true, lastName: true } },
      document: { select: { documentType: true, expiryDate: true } },
      requestedUser: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
  });
}

export async function getAssistanceDashboardStats(actor: SessionUser) {
  if (!canManageAssistance(actor)) {
    return { newRequests: 0, highUrgency: 0, overdue: 0, assignedToMe: 0 };
  }
  const visibility = assistanceListWhere(actor);
  const today = parseDateOnly(new Date().toISOString().slice(0, 10));
  const [newRequests, highUrgency, overdue, assignedToMe] = await Promise.all([
    prisma.assistanceRequest.count({ where: { AND: [visibility, { status: "NEW" }] } }),
    prisma.assistanceRequest.count({
      where: {
        AND: [
          visibility,
          { urgency: "HIGH" },
          { status: { in: ["NEW", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_MEMBER"] } },
        ],
      },
    }),
    prisma.assistanceRequest.count({
      where: {
        AND: [
          visibility,
          { preferredResponseBy: { lt: today } },
          { status: { in: ["NEW", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_MEMBER"] } },
        ],
      },
    }),
    prisma.assistanceRequest.count({
      where: {
        AND: [
          visibility,
          { assignedToId: actor.id },
          { status: { in: ["NEW", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_MEMBER"] } },
        ],
      },
    }),
  ]);
  return { newRequests, highUrgency, overdue, assignedToMe };
}

export async function getAssistanceRequest(id: string, actor: SessionUser) {
  const request = await prisma.assistanceRequest.findFirst({
    where: { id, AND: [assistanceListWhere(actor)] },
    include: requestInclude,
  });
  if (!request) {
    throw new AppError("Request not found.", 404, "NOT_FOUND");
  }
  return request;
}

export async function createAssistanceRequest(
  actor: SessionUser,
  input: CreateAssistanceRequestInput,
) {
  if (actor.role !== "MEMBER") {
    throw new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN");
  }
  const member = await prisma.member.findFirst({
    where: { active: true, email: actor.email },
    include: { documents: true },
  });
  if (!member) {
    throw new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN");
  }

  let documentId: string | null = null;
  if (input.category === "IMMIGRATION_DOCUMENT") {
    if (!input.documentId) {
      throw new AppError("Select the immigration document this request is about.", 400);
    }
    const document = member.documents.find((doc) => doc.id === input.documentId);
    if (!document || !isEligibleImmigrationDocument(document.expiryDate)) {
      throw new AppError(
        "Immigration assistance is only available for documents expiring within 12 months or already expired.",
        400,
      );
    }
    documentId = document.id;
  }

  let requestedUserId: string | null = null;
  let assignedToId: string | null = null;
  let status: AssistanceStatus = "NEW";
  if (input.requestedUserId && input.requestedUserId !== "ANY") {
    const staff = await prisma.user.findFirst({
      where: {
        id: input.requestedUserId,
        active: true,
        role: input.requestedRole,
      },
    });
    if (!staff) {
      throw new AppError("Select an active person for that role.", 400);
    }
    requestedUserId = staff.id;
    assignedToId = staff.id;
    status = "ASSIGNED";
  }

  const request = await prisma.assistanceRequest.create({
    data: {
      memberId: member.id,
      category: input.category,
      documentId,
      requestedRole: input.requestedRole,
      requestedUserId,
      urgency: input.urgency,
      impact: input.impact,
      memberNote: input.memberNote?.trim() || null,
      preferredResponseBy: input.preferredResponseBy
        ? parseDateOnly(input.preferredResponseBy)
        : null,
      assignedToId,
      status,
      updates: {
        create: {
          status,
          assignedToId,
          createdById: actor.id,
        },
      },
    },
    include: {
      document: true,
      requestedUser: true,
      assignedTo: true,
    },
  });

  const recipients =
    requestedUserId && request.requestedUser
      ? [request.requestedUser]
      : await listStaffContactsByRole(input.requestedRole);

  const memberName = fullName(member);
  const categoryLabel = assistanceCategoryLabel(input.category);
  const title = `${memberName} requested assistance`;
  const documentPart = request.document
    ? ` regarding their ${documentTypeLabel(request.document.documentType)} expiring on ${request.document.expiryDate.toISOString().slice(0, 10)}`
    : "";
  const message = `${memberName} submitted a ${categoryLabel} assistance request${documentPart}. Urgency: ${input.urgency}.`;

  await Promise.all(
    recipients.map(async (person) => {
      await createStaffNotification({
        userId: person.id,
        memberId: member.id,
        requestId: request.id,
        title,
        message,
      });
      await sendEmail({
        to: person.email,
        subject: title,
        text: `${message}${input.memberNote?.trim() ? `\n\nMember note: ${input.memberNote.trim()}` : ""}\n\nOpen Assistance Requests in YCMS.`,
      });
    }),
  );

  return request;
}

export async function updateAssistanceRequest(
  actor: SessionUser,
  input: UpdateAssistanceRequestInput,
) {
  if (!canManageAssistance(actor)) {
    throw new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN");
  }
  const existing = await getAssistanceRequest(input.id, actor);
  let assignedToId = input.assignedToId || null;
  if (assignedToId) {
    const assignee = await prisma.user.findFirst({
      where: {
        id: assignedToId,
        active: true,
        role: { in: actor.role === "ADMIN" ? ["ADMIN", "COORDINATOR"] : ["COORDINATOR"] },
      },
    });
    if (!assignee) {
      throw new AppError("Select an authorized staff member.", 400);
    }
  }
  let status = input.status;
  if (assignedToId && status === "NEW") status = "ASSIGNED";
  const resolvedAt =
    status === "RESOLVED" || status === "CLOSED"
      ? existing.resolvedAt ?? new Date()
      : null;

  return prisma.assistanceRequest.update({
    where: { id: existing.id },
    data: {
      assignedToId,
      status,
      resolvedAt,
      updates: {
        create: {
          status,
          assignedToId,
          internalNote: input.internalNote?.trim() || null,
          createdById: actor.id,
        },
      },
    },
  });
}

export async function listAssignableAssistanceStaff(actor: SessionUser) {
  const roles: UserRole[] = actor.role === "ADMIN" ? ["ADMIN", "COORDINATOR"] : ["COORDINATOR"];
  return prisma.user.findMany({
    where: { active: true, role: { in: roles } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}
