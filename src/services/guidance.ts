import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { notifyUser } from "@/services/notifications";
import type { GuidanceCategory, GuidanceStatus } from "@prisma/client";

export async function createGuidanceRequest(input: {
  memberId: string;
  category: GuidanceCategory;
  otherTopic?: string;
  message: string;
}) {
  const request = await prisma.guidanceRequest.create({
    data: {
      memberId: input.memberId,
      category: input.category,
      otherTopic: input.category === "OTHER" ? input.otherTopic : null,
      message: input.message,
    },
    include: { member: true },
  });
  const coordinators = await prisma.user.findMany({
    where: { role: "COORDINATOR", active: true },
    select: { id: true, email: true },
  });
  for (const coordinator of coordinators) {
    await notifyUser({
      userId: coordinator.id,
      title: "New guidance request",
      body: `${request.member.firstName} ${request.member.lastName} asked for ${input.category.replaceAll("_", " ").toLowerCase()} guidance.`,
      href: `/guidance/${request.id}`,
    });
  }
  return request;
}

export async function listGuidanceRequests(filters?: {
  status?: GuidanceStatus;
  assignedToId?: string;
  category?: GuidanceCategory;
  from?: Date;
  to?: Date;
}) {
  return prisma.guidanceRequest.findMany({
    where: {
      status: filters?.status,
      assignedToId: filters?.assignedToId,
      category: filters?.category,
      createdAt: {
        gte: filters?.from,
        lte: filters?.to,
      },
    },
    include: {
      member: true,
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getGuidanceRequest(id: string) {
  const request = await prisma.guidanceRequest.findUnique({
    where: { id },
    include: {
      member: true,
      assignedTo: true,
      messages: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!request) throw new AppError("Guidance request not found.", 404);
  return request;
}

export async function claimGuidanceRequest(id: string, coordinatorId: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.guidanceRequest.findUnique({ where: { id } });
    if (!request) throw new AppError("Guidance request not found.", 404);
    if (request.assignedToId && request.assignedToId !== coordinatorId) {
      throw new AppError("This request is already claimed.");
    }
    return tx.guidanceRequest.update({
      where: { id },
      data: {
        assignedToId: coordinatorId,
        status: "CLAIMED",
        claimedAt: request.claimedAt ?? new Date(),
      },
    });
  });
}

export async function addGuidanceMessage(input: {
  requestId: string;
  authorId: string;
  body: string;
  asCoordinator: boolean;
}) {
  const request = await prisma.guidanceRequest.findUnique({
    where: { id: input.requestId },
    include: { member: { include: { loginUser: true } }, assignedTo: true },
  });
  if (!request) throw new AppError("Guidance request not found.", 404);
  const message = await prisma.guidanceMessage.create({
    data: {
      requestId: input.requestId,
      authorId: input.authorId,
      body: input.body,
    },
  });
  if (input.asCoordinator) {
    await prisma.guidanceRequest.update({
      where: { id: input.requestId },
      data: { status: "WAITING_FOR_MEMBER" },
    });
    if (request.member.loginUser) {
      await notifyUser({
        userId: request.member.loginUser.id,
        title: "Guidance update",
        body: "A coordinator replied to your guidance request.",
        href: "/portal/guidance",
      });
    }
  } else if (request.assignedToId) {
    await notifyUser({
      userId: request.assignedToId,
      title: "Guidance reply",
      body: `${request.member.firstName} ${request.member.lastName} replied.`,
      href: `/guidance/${request.id}`,
    });
  }
  return message;
}

export async function resolveGuidanceRequest(id: string) {
  return prisma.guidanceRequest.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
}

export async function memberGuidance(memberId: string) {
  return prisma.guidanceRequest.findMany({
    where: { memberId },
    include: {
      assignedTo: { select: { name: true } },
      messages: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}
