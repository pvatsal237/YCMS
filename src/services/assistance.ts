import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { sendEmail } from "@/lib/email";
import { parseDateOnly } from "@/lib/dates";
import { ensureAssistanceSchema } from "@/lib/assistance-schema";
import { createStaffNotification } from "@/services/staff-notifications";
import { getAlertPresentation } from "@/utils/immigration-alerts";
import { assistanceCategoryLabel, documentTypeLabel, fullName } from "@/utils/format";
import type { SessionUser } from "@/types";
import type {
  CreateAssistanceRequestInput,
  UpdateAssistanceRequestInput,
} from "@/validations/assistance";
import type { UserRole } from "@/types/roles";

export function isEligibleImmigrationDocument(expiryDate: Date) {
  return getAlertPresentation(expiryDate).level !== "VALID";
}

export function assistanceListWhere(actor: SessionUser) {
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

function visibilitySql(actor: SessionUser) {
  if (actor.role === "ADMIN") return Prisma.sql`TRUE`;
  if (actor.role === "COORDINATOR") {
    return Prisma.sql`(
      r."requestedRole" = 'COORDINATOR'::"UserRole"
      OR r."requestedUserId" = ${actor.id}
      OR r."assignedToId" = ${actor.id}
    )`;
  }
  return Prisma.sql`FALSE`;
}

const listSelect = Prisma.raw(`
  r.id,
  r."memberId",
  r.category::text AS category,
  r."documentId",
  r."requestedRole"::text AS "requestedRole",
  r."requestedUserId",
  r.urgency::text AS urgency,
  r.impact::text AS impact,
  r."memberNote",
  r."preferredResponseBy",
  r."assignedToId",
  r.status::text AS status,
  r."createdAt",
  r."updatedAt",
  r."resolvedAt",
  m."firstName",
  m."lastName",
  m.email,
  m.phone,
  d."documentType"::text AS "documentType",
  d."expiryDate",
  ru.name AS "requestedUserName",
  ru.role::text AS "requestedUserRole",
  ru.email AS "requestedUserEmail",
  a.name AS "assignedToName",
  a.role::text AS "assignedToRole"
`);

type AssistanceRow = {
  id: string;
  memberId: string;
  category: string;
  documentId: string | null;
  requestedRole: string;
  requestedUserId: string | null;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  impact: "LOW" | "MEDIUM" | "HIGH";
  memberNote: string | null;
  preferredResponseBy: Date | null;
  assignedToId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentType: string | null;
  expiryDate: Date | null;
  requestedUserName: string | null;
  requestedUserRole: string | null;
  requestedUserEmail: string | null;
  assignedToName: string | null;
  assignedToRole: string | null;
};

function mapRequest(row: AssistanceRow) {
  return {
    id: row.id,
    memberId: row.memberId,
    category: row.category,
    documentId: row.documentId,
    requestedRole: row.requestedRole,
    requestedUserId: row.requestedUserId,
    urgency: row.urgency,
    impact: row.impact,
    memberNote: row.memberNote,
    preferredResponseBy: row.preferredResponseBy,
    assignedToId: row.assignedToId,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    resolvedAt: row.resolvedAt,
    member: {
      id: row.memberId,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
    },
    document:
      row.documentId && row.documentType && row.expiryDate
        ? {
            id: row.documentId,
            documentType: row.documentType,
            expiryDate: row.expiryDate,
          }
        : null,
    requestedUser: row.requestedUserId
      ? {
          id: row.requestedUserId,
          name: row.requestedUserName ?? "",
          role: row.requestedUserRole,
          email: row.requestedUserEmail ?? "",
        }
      : null,
    assignedTo: row.assignedToId
      ? {
          id: row.assignedToId,
          name: row.assignedToName ?? "",
          role: row.assignedToRole,
        }
      : null,
  };
}

export async function listStaffContactsByRole(role: "ADMIN" | "COORDINATOR") {
  return prisma.user.findMany({
    where: { active: true, role },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function listMemberAssistanceRequests(memberId: string) {
  await ensureAssistanceSchema();
  const rows = await prisma.$queryRaw<AssistanceRow[]>`
    SELECT ${listSelect}
    FROM "AssistanceRequest" r
    JOIN "Member" m ON m.id = r."memberId"
    LEFT JOIN "ImmigrationDocument" d ON d.id = r."documentId"
    LEFT JOIN "User" ru ON ru.id = r."requestedUserId"
    LEFT JOIN "User" a ON a.id = r."assignedToId"
    WHERE r."memberId" = ${memberId}
    ORDER BY r."createdAt" DESC
  `;
  return rows.map(mapRequest);
}

export async function listAssistanceRequests(
  actor: SessionUser,
  filters: {
    status?: string;
    requestedRole?: "ADMIN" | "COORDINATOR";
    urgency?: "LOW" | "MEDIUM" | "HIGH";
    category?: string;
  },
) {
  if (!canManageAssistance(actor)) {
    throw new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN");
  }
  await ensureAssistanceSchema();
  const rows = await prisma.$queryRaw<AssistanceRow[]>`
    SELECT ${listSelect}
    FROM "AssistanceRequest" r
    JOIN "Member" m ON m.id = r."memberId"
    LEFT JOIN "ImmigrationDocument" d ON d.id = r."documentId"
    LEFT JOIN "User" ru ON ru.id = r."requestedUserId"
    LEFT JOIN "User" a ON a.id = r."assignedToId"
    WHERE ${visibilitySql(actor)}
      AND (${filters.status ? Prisma.sql`r.status = ${filters.status}::"AssistanceStatus"` : Prisma.sql`TRUE`})
      AND (${filters.requestedRole ? Prisma.sql`r."requestedRole" = ${filters.requestedRole}::"UserRole"` : Prisma.sql`TRUE`})
      AND (${filters.urgency ? Prisma.sql`r.urgency = ${filters.urgency}::"AssistancePriority"` : Prisma.sql`TRUE`})
      AND (${filters.category ? Prisma.sql`r.category = ${filters.category}::"AssistanceCategory"` : Prisma.sql`TRUE`})
    ORDER BY r.urgency DESC, r."createdAt" DESC
  `;
  return rows.map(mapRequest);
}

export async function getAssistanceDashboardStats(actor: SessionUser) {
  if (!canManageAssistance(actor)) {
    return { newRequests: 0, highUrgency: 0, overdue: 0, assignedToMe: 0 };
  }
  await ensureAssistanceSchema();
  const today = parseDateOnly(new Date().toISOString().slice(0, 10));
  const open = Prisma.sql`r.status IN ('NEW'::"AssistanceStatus", 'ASSIGNED'::"AssistanceStatus", 'IN_PROGRESS'::"AssistanceStatus", 'WAITING_FOR_MEMBER'::"AssistanceStatus")`;
  const [newRows, highRows, overdueRows, mineRows] = await Promise.all([
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*)::bigint AS n FROM "AssistanceRequest" r
      WHERE ${visibilitySql(actor)} AND r.status = 'NEW'::"AssistanceStatus"
    `,
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*)::bigint AS n FROM "AssistanceRequest" r
      WHERE ${visibilitySql(actor)} AND r.urgency = 'HIGH'::"AssistancePriority" AND ${open}
    `,
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*)::bigint AS n FROM "AssistanceRequest" r
      WHERE ${visibilitySql(actor)} AND r."preferredResponseBy" < ${today} AND ${open}
    `,
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*)::bigint AS n FROM "AssistanceRequest" r
      WHERE ${visibilitySql(actor)} AND r."assignedToId" = ${actor.id} AND ${open}
    `,
  ]);
  return {
    newRequests: Number(newRows[0]?.n ?? 0),
    highUrgency: Number(highRows[0]?.n ?? 0),
    overdue: Number(overdueRows[0]?.n ?? 0),
    assignedToMe: Number(mineRows[0]?.n ?? 0),
  };
}

export async function getAssistanceRequest(id: string, actor: SessionUser) {
  await ensureAssistanceSchema();
  const rows = await prisma.$queryRaw<AssistanceRow[]>`
    SELECT ${listSelect}
    FROM "AssistanceRequest" r
    JOIN "Member" m ON m.id = r."memberId"
    LEFT JOIN "ImmigrationDocument" d ON d.id = r."documentId"
    LEFT JOIN "User" ru ON ru.id = r."requestedUserId"
    LEFT JOIN "User" a ON a.id = r."assignedToId"
    WHERE r.id = ${id} AND ${visibilitySql(actor)}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    throw new AppError("Request not found.", 404, "NOT_FOUND");
  }
  const updates = await prisma.$queryRaw<
    {
      id: string;
      status: string | null;
      assignedToId: string | null;
      internalNote: string | null;
      createdAt: Date;
      createdByName: string | null;
    }[]
  >`
    SELECT
      u.id,
      u.status::text AS status,
      u."assignedToId",
      u."internalNote",
      u."createdAt",
      c.name AS "createdByName"
    FROM "AssistanceRequestUpdate" u
    LEFT JOIN "User" c ON c.id = u."createdById"
    WHERE u."requestId" = ${id}
    ORDER BY u."createdAt" DESC
  `;
  return {
    ...mapRequest(row),
    updates: updates.map((item) => ({
      id: item.id,
      status: item.status,
      assignedToId: item.assignedToId,
      internalNote: item.internalNote,
      createdAt: item.createdAt,
      createdBy: item.createdByName ? { id: "", name: item.createdByName } : null,
    })),
  };
}

export async function createAssistanceRequest(
  actor: SessionUser,
  input: CreateAssistanceRequestInput,
) {
  if (actor.role !== "MEMBER") {
    throw new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN");
  }
  await ensureAssistanceSchema();
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
  let status: string = "NEW";
  let requestedUser: { id: string; name: string; email: string; role: UserRole } | null = null;
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
    requestedUser = staff;
  }

  const id = randomUUID();
  const preferred = input.preferredResponseBy
    ? parseDateOnly(input.preferredResponseBy)
    : null;
  const note = input.memberNote?.trim() || null;
  await prisma.$executeRaw`
    INSERT INTO "AssistanceRequest" (
      id, "memberId", category, "documentId", "requestedRole", "requestedUserId",
      urgency, impact, "memberNote", "preferredResponseBy", "assignedToId", status,
      "createdAt", "updatedAt"
    )
    VALUES (
      ${id},
      ${member.id},
      ${input.category}::"AssistanceCategory",
      ${documentId},
      ${input.requestedRole}::"UserRole",
      ${requestedUserId},
      ${input.urgency}::"AssistancePriority",
      ${input.impact}::"AssistancePriority",
      ${note},
      ${preferred},
      ${assignedToId},
      ${status}::"AssistanceStatus",
      NOW(),
      NOW()
    )
  `;
  await prisma.$executeRaw`
    INSERT INTO "AssistanceRequestUpdate" (id, "requestId", status, "assignedToId", "createdById", "createdAt")
    VALUES (${randomUUID()}, ${id}, ${status}::"AssistanceStatus", ${assignedToId}, ${actor.id}, NOW())
  `;

  const recipients = requestedUser
    ? [requestedUser]
    : await listStaffContactsByRole(input.requestedRole);

  const memberName = fullName(member);
  const categoryLabel = assistanceCategoryLabel(input.category);
  const title = `${memberName} requested assistance`;
  const document = documentId
    ? member.documents.find((doc) => doc.id === documentId)
    : null;
  const documentPart = document
    ? ` regarding their ${documentTypeLabel(document.documentType)} expiring on ${document.expiryDate.toISOString().slice(0, 10)}`
    : "";
  const message = `${memberName} submitted a ${categoryLabel} assistance request${documentPart}. Urgency: ${input.urgency}.`;

  await Promise.all(
    recipients.map(async (person) => {
      await createStaffNotification({
        userId: person.id,
        memberId: member.id,
        requestId: id,
        title,
        message,
      });
      await sendEmail({
        to: person.email,
        subject: title,
        text: `${message}${note ? `\n\nMember note: ${note}` : ""}\n\nOpen Assistance Requests in YCMS.`,
      });
    }),
  );

  return { id };
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
  const internalNote = input.internalNote?.trim() || null;

  await prisma.$executeRaw`
    UPDATE "AssistanceRequest"
    SET
      "assignedToId" = ${assignedToId},
      status = ${status}::"AssistanceStatus",
      "resolvedAt" = ${resolvedAt},
      "updatedAt" = NOW()
    WHERE id = ${existing.id}
  `;
  await prisma.$executeRaw`
    INSERT INTO "AssistanceRequestUpdate"
      (id, "requestId", status, "assignedToId", "internalNote", "createdById", "createdAt")
    VALUES (
      ${randomUUID()},
      ${existing.id},
      ${status}::"AssistanceStatus",
      ${assignedToId},
      ${internalNote},
      ${actor.id},
      NOW()
    )
  `;
  return { id: existing.id };
}

export async function listAssignableAssistanceStaff(actor: SessionUser) {
  const roles: UserRole[] = actor.role === "ADMIN" ? ["ADMIN", "COORDINATOR"] : ["COORDINATOR"];
  return prisma.user.findMany({
    where: { active: true, role: { in: roles } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}
