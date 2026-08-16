import { randomUUID } from "node:crypto";
import { prisma, connectPrisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { ensureMemberAuthSchema } from "@/lib/member-auth-schema";
import type { SessionUser } from "@/types";

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

  const upcomingMeetup = await prisma.meetup.findFirst({
    where: { active: true, meetupDate: { gte: new Date() } },
    orderBy: { meetupDate: "asc" },
    select: { title: true, meetupDate: true, location: true },
  });

  await ensureMemberAuthSchema();
  const pendingRequests = await prisma.$queryRaw<
    {
      id: string;
      requestType: string | null;
      documentId: string | null;
      proposedExpiry: Date | null;
      status: string;
      createdAt: Date;
    }[]
  >`
    SELECT id, "requestType", "documentId", "proposedExpiry", status, "createdAt"
    FROM "MemberProfileChangeRequest"
    WHERE "memberId" = ${member.id} AND status = 'PENDING'
    ORDER BY "createdAt" DESC
  `;

  return { member, upcomingMeetup, pendingRequests };
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
    requestType: "RENEWAL_REQUESTED" | "RENEWED";
    proposedExpiry?: string;
  },
) {
  await ensureMemberAuthSchema();
  const data = await getMemberPortalData(actor);
  const document = data.member.documents.find((doc) => doc.id === input.documentId);
  if (!document) {
    throw new AppError("Document not found.", 404, "NOT_FOUND");
  }
  if (input.requestType === "RENEWED" && !input.proposedExpiry) {
    throw new AppError("Select the new expiry date.", 400);
  }
  const message =
    input.requestType === "RENEWED"
      ? `Member reports this document is already renewed. Proposed new expiry: ${input.proposedExpiry}.`
      : "Member reports they have requested a renewal. Please follow up.";
  await prisma.$executeRaw`
    INSERT INTO "MemberProfileChangeRequest"
      (id, "memberId", message, status, "requestType", "documentId", "proposedExpiry", "createdAt")
    VALUES (
      ${randomUUID()},
      ${data.member.id},
      ${message},
      'PENDING',
      ${input.requestType},
      ${input.documentId},
      ${input.proposedExpiry ? new Date(`${input.proposedExpiry}T00:00:00.000Z`) : null},
      NOW()
    )
  `;
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
      r."createdAt"
    FROM "MemberProfileChangeRequest" r
    JOIN "Member" m ON m.id = r."memberId"
    LEFT JOIN "ImmigrationDocument" d ON d.id = r."documentId"
    WHERE r.status = 'PENDING'
      AND r."requestType" IN ('RENEWAL_REQUESTED', 'RENEWED')
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

