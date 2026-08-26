import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logSafe } from "@/lib/log";
import { notifyCoordinators, notifyUser } from "@/services/notifications";
import { GUIDANCE_LABELS } from "@/utils/format";
import type { GuidanceCategory, GuidanceStatus } from "@prisma/client";
import type { SessionUser } from "@/types";

export async function createGuidanceRequest(
  user: SessionUser,
  input: { category: GuidanceCategory; customTopic?: string; message: string; eventId?: string },
) {
  if (user.role !== "MEMBER" || !user.memberId) {
    throw new AppError("Only members can request guidance.", 403);
  }
  if (input.category === "OTHER" && !input.customTopic?.trim()) {
    throw new AppError("Please tell us the topic.", 400);
  }
  if (!input.message.trim()) throw new AppError("Please tell us briefly how we can help.", 400);
  const request = await prisma.guidanceRequest.create({
    data: {
      memberId: user.memberId,
      category: input.category,
      customTopic: input.customTopic?.trim() || null,
      message: input.message.trim(),
      eventId: input.eventId || null,
    },
  });
  await notifyCoordinators({
    title: "New guidance request",
    message: `${user.name} asked for help with ${GUIDANCE_LABELS[input.category]}.`,
    href: `/guidance/${request.id}`,
  });
  logSafe("guidance.created", { requestId: request.id, category: input.category });
  return request;
}

export async function listGuidanceForCoordinator() {
  return prisma.guidanceRequest.findMany({
    include: { member: true, claimedBy: { select: { name: true, email: true } }, event: true, messages: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listMyGuidance(memberId: string) {
  return prisma.guidanceRequest.findMany({
    where: { memberId },
    include: { claimedBy: { select: { name: true } }, messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getGuidance(id: string) {
  return prisma.guidanceRequest.findUnique({
    where: { id },
    include: {
      member: true,
      claimedBy: { select: { id: true, name: true, email: true } },
      event: true,
      messages: { include: { user: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function claimGuidance(actor: SessionUser, id: string) {
  if (actor.role !== "COORDINATOR") throw new AppError("Only coordinators can claim requests.", 403);
  const updated = await prisma.guidanceRequest.updateMany({
    where: { id, claimedById: null, status: "NEW" },
    data: { claimedById: actor.id, claimedAt: new Date(), status: "CLAIMED" },
  });
  if (updated.count !== 1) {
    throw new AppError("This request was already claimed.", 409);
  }
  const request = await prisma.guidanceRequest.findUnique({
    where: { id },
    include: { member: true },
  });
  const memberUser = await prisma.user.findUnique({ where: { email: request?.member.email ?? "" } });
  if (request && memberUser) {
    await notifyUser({
      userId: memberUser.id,
      title: "Guidance request claimed",
      message: `${actor.name} will follow up on your request.`,
      href: "/request-guidance",
    });
  }
  logSafe("guidance.claimed", { requestId: id, coordinatorId: actor.id });
  return request;
}

export async function updateGuidanceStatus(actor: SessionUser, id: string, status: GuidanceStatus) {
  if (actor.role !== "COORDINATOR") throw new AppError("Only coordinators can update requests.", 403);
  const request = await prisma.guidanceRequest.findUnique({ where: { id } });
  if (!request) throw new AppError("Request not found.", 404);
  if (request.claimedById !== actor.id) throw new AppError("Only the owner can update this request.", 403);
  const updated = await prisma.guidanceRequest.update({
    where: { id },
    data: { status, resolvedAt: status === "RESOLVED" ? new Date() : request.resolvedAt },
  });
  const memberUser = await prisma.user.findFirst({ where: { memberId: request.memberId } });
  if (memberUser) {
    await notifyUser({
      userId: memberUser.id,
      title: "Guidance update",
      message: `Your request is now ${status.replaceAll("_", " ").toLowerCase()}.`,
      href: "/request-guidance",
      email:
        status === "RESOLVED"
          ? {
              to: memberUser.email,
              subject: "Your IYCM guidance request was resolved",
              text: "A coordinator marked your guidance request as resolved.",
            }
          : undefined,
    });
  }
  logSafe("guidance.status", { requestId: id, status });
  return updated;
}

export async function addGuidanceMessage(actor: SessionUser, id: string, body: string) {
  if (!body.trim()) throw new AppError("Please enter a short message.", 400);
  const request = await prisma.guidanceRequest.findUnique({
    where: { id },
    include: { member: true },
  });
  if (!request) throw new AppError("Request not found.", 404);
  const isOwner = actor.role === "COORDINATOR" && request.claimedById === actor.id;
  const isMember = actor.role === "MEMBER" && actor.memberId === request.memberId;
  if (!isOwner && !isMember) throw new AppError("You cannot message on this request.", 403);
  const message = await prisma.guidanceMessage.create({
    data: { requestId: id, userId: actor.id, body: body.trim() },
  });
  if (isOwner) {
    const memberUser = await prisma.user.findFirst({ where: { memberId: request.memberId } });
    if (memberUser) {
      await notifyUser({
        userId: memberUser.id,
        title: "Guidance reply",
        message: `${actor.name} replied to your request.`,
        href: "/request-guidance",
        email: {
          to: memberUser.email,
          subject: "New guidance reply from IYCM",
          text: "A coordinator replied to your guidance request.",
        },
      });
    }
  } else if (request.claimedById) {
    await notifyUser({
      userId: request.claimedById,
      title: "Member replied",
      message: `${request.member.firstName} ${request.member.lastName} replied.`,
      href: `/guidance/${id}`,
    });
  }
  logSafe("guidance.message", { requestId: id });
  return message;
}
