import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma, connectPrisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { sendEmail } from "@/lib/email";
import { formatDate } from "@/lib/dates";
import { ensureMemberAuthSchema } from "@/lib/member-auth-schema";
import { createStaffNotification } from "@/services/staff-notifications";
import { documentRequestTypeLabel, documentTypeLabel, fullName } from "@/utils/format";
import type { SessionUser } from "@/types";
import type { UserRole } from "@/types/roles";

const DOCUMENT_REQUEST_TYPES = [
  "NEED_ASSISTANCE",
  "RENEWAL_REQUESTED",
  "RENEWED",
  "IRCC_QUERY",
] as const;

type DocumentRequestType = (typeof DOCUMENT_REQUEST_TYPES)[number];

export async function getMemberPortalData(actor: SessionUser) {
  if (actor.role !== "MEMBER") {
    throw new AppError(
      "You do not have permission to perform this action.",
      403,
      "FORBIDDEN",
    );
  }

  await connectPrisma();
  try {
    return await loadMemberPortalData(actor);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("not yet connected")) throw error;
    await connectPrisma();
    return loadMemberPortalData(actor);
  }
}

async function loadMemberPortalData(actor: SessionUser) {
  const member = await prisma.member.findFirst({
    where: {
      active: true,
      email: actor.email,
    },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      phone: true,
      dateJoined: true,
      documents: {
        select: {
          id: true,
          documentType: true,
          expiryDate: true,
        },
        orderBy: { expiryDate: "asc" },
      },
      attendance: {
        select: {
          status: true,
          meetup: { select: { meetupDate: true, title: true, location: true } },
        },
        orderBy: { meetup: { meetupDate: "desc" } },
        take: 20,
      },
      followUps: {
        select: {
          status: true,
          lastOutcome: true,
          nextFollowUpAt: true,
          reason: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!member) {
    throw new AppError("You do not have permission to perform this action.", 403);
  }

  let upcomingMeetup: {
    id: string;
    title: string;
    meetupDate: Date;
    location: string;
    startTime: string | null;
    endTime: string | null;
    eventType: string;
  } | null = null;
  try {
    upcomingMeetup = await prisma.meetup.findFirst({
      where: { active: true, meetupDate: { gte: new Date() } },
      orderBy: { meetupDate: "asc" },
      select: {
        id: true,
        title: true,
        meetupDate: true,
        location: true,
        startTime: true,
        endTime: true,
        eventType: true,
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientValidationError)) throw error;
    const row = await prisma.meetup.findFirst({
      where: { active: true, meetupDate: { gte: new Date() } },
      orderBy: { meetupDate: "asc" },
      select: { id: true, title: true, meetupDate: true, location: true },
    });
    upcomingMeetup = row
      ? { ...row, startTime: null, endTime: null, eventType: "WEEKLY_MEETUP" }
      : null;
  }

  await ensureMemberAuthSchema();
  const pendingRequests = await prisma.$queryRaw<
    {
      id: string;
      requestType: string | null;
      documentId: string | null;
      proposedExpiry: Date | null;
      assignedToUserId: string | null;
      status: string;
      createdAt: Date;
    }[]
  >`
    SELECT id, "requestType", "documentId", "proposedExpiry", "assignedToUserId", status, "createdAt"
    FROM "MemberProfileChangeRequest"
    WHERE "memberId" = ${member.id} AND status = 'PENDING'
    ORDER BY "createdAt" DESC
  `;

  const staffContacts = await prisma.$queryRaw<
    { id: string; name: string; email: string; role: UserRole }[]
  >`
    SELECT id, name, email, role::text AS role
    FROM "User"
    WHERE active = true AND role IN ('ADMIN'::"UserRole", 'COORDINATOR'::"UserRole")
    ORDER BY name ASC
  `;

  return { member, upcomingMeetup, pendingRequests, staffContacts };
}

export async function createProfileChangeRequest(actor: SessionUser, message: string) {
  await ensureMemberAuthSchema();
  const data = await getMemberPortalData(actor);
  await prisma.$executeRaw`
    INSERT INTO "MemberProfileChangeRequest" (id, "memberId", message, status, "requestType", "createdAt")
    VALUES (${randomUUID()}, ${data.member.id}, ${message.trim()}, 'PENDING', 'PROFILE', NOW())
  `;
}

export async function createDocumentRenewalRequest(
  actor: SessionUser,
  input: {
    documentId: string;
    requestType: DocumentRequestType;
    assignedToUserId: string;
    proposedExpiry?: string;
  },
) {
  await ensureMemberAuthSchema();
  const data = await getMemberPortalData(actor);
  const document = data.member.documents.find((doc) => doc.id === input.documentId);
  if (!document) {
    throw new AppError("Document not found.", 404, "NOT_FOUND");
  }
  if (!DOCUMENT_REQUEST_TYPES.includes(input.requestType)) {
    throw new AppError("Choose a status.", 400);
  }
  if (input.requestType === "RENEWED" && !input.proposedExpiry) {
    throw new AppError("Select the new expiry date.", 400);
  }
  const staff = data.staffContacts.find((person) => person.id === input.assignedToUserId);
  if (!staff) {
    throw new AppError("Select an administrator or coordinator.", 400);
  }

  const memberName = fullName(data.member);
  const docLabel = documentTypeLabel(document.documentType);
  const expiryLabel = formatDate(document.expiryDate);
  const statusLabel = documentRequestTypeLabel(input.requestType);
  const message = [
    `${memberName} requested assistance regarding their ${docLabel} expiring on ${expiryLabel}.`,
    `Selected status: ${statusLabel}.`,
    input.proposedExpiry ? `Proposed new expiry: ${input.proposedExpiry}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM "MemberProfileChangeRequest"
    WHERE "memberId" = ${data.member.id}
      AND "documentId" = ${input.documentId}
      AND status = 'PENDING'
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  const requestId = existing[0]?.id ?? randomUUID();
  const proposed = input.proposedExpiry
    ? new Date(`${input.proposedExpiry}T00:00:00.000Z`)
    : null;

  if (existing[0]) {
    await prisma.$executeRaw`
      UPDATE "MemberProfileChangeRequest"
      SET
        message = ${message},
        "requestType" = ${input.requestType},
        "proposedExpiry" = ${proposed},
        "assignedToUserId" = ${staff.id}
      WHERE id = ${requestId}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO "MemberProfileChangeRequest"
        (id, "memberId", message, status, "requestType", "documentId", "proposedExpiry", "assignedToUserId", "createdAt")
      VALUES (
        ${requestId},
        ${data.member.id},
        ${message},
        'PENDING',
        ${input.requestType},
        ${input.documentId},
        ${proposed},
        ${staff.id},
        NOW()
      )
    `;
  }

  const title = `${memberName} needs help with a ${docLabel}`;
  await createStaffNotification({
    userId: staff.id,
    memberId: data.member.id,
    requestId,
    title,
    message,
  });
  await sendEmail({
    to: staff.email,
    subject: title,
    text: `${message}\n\nOpen YCMS to follow up with this member.`,
  });
}

export async function listPendingDocumentRequests() {
  await ensureMemberAuthSchema();
  return prisma.$queryRaw<
    {
      id: string;
      memberId: string;
      firstName: string;
      lastName: string;
      requestType: string | null;
      documentId: string | null;
      documentType: string | null;
      proposedExpiry: Date | null;
      message: string;
      createdAt: Date;
      assignedToName: string | null;
    }[]
  >`
    SELECT
      r.id,
      r."memberId",
      m."firstName",
      m."lastName",
      r."requestType",
      r."documentId",
      d."documentType"::text AS "documentType",
      r."proposedExpiry",
      r.message,
      r."createdAt",
      u.name AS "assignedToName"
    FROM "MemberProfileChangeRequest" r
    JOIN "Member" m ON m.id = r."memberId"
    LEFT JOIN "ImmigrationDocument" d ON d.id = r."documentId"
    LEFT JOIN "User" u ON u.id = r."assignedToUserId"
    WHERE r.status = 'PENDING'
      AND r."requestType" IN ('NEED_ASSISTANCE', 'RENEWAL_REQUESTED', 'RENEWED', 'IRCC_QUERY')
    ORDER BY r."createdAt" DESC
  `;
}

export async function reviewDocumentRequest(
  requestId: string,
  decision: "APPROVED" | "REJECTED",
) {
  await ensureMemberAuthSchema();
  const rows = await prisma.$queryRaw<
    {
      id: string;
      documentId: string | null;
      requestType: string | null;
      proposedExpiry: Date | null;
      status: string;
    }[]
  >`
    SELECT id, "documentId", "requestType", "proposedExpiry", status
    FROM "MemberProfileChangeRequest"
    WHERE id = ${requestId}
    LIMIT 1
  `;
  const request = rows[0];
  if (!request || request.status !== "PENDING") {
    throw new AppError("Request not found.", 404, "NOT_FOUND");
  }
  if (decision === "APPROVED" && request.requestType === "RENEWED" && request.documentId && request.proposedExpiry) {
    await prisma.immigrationDocument.update({
      where: { id: request.documentId },
      data: { expiryDate: new Date(request.proposedExpiry) },
    });
  }
  await prisma.$executeRaw`
    UPDATE "MemberProfileChangeRequest"
    SET status = ${decision}
    WHERE id = ${requestId}
  `;
}
