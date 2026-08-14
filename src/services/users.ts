import { Prisma, type UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/passwords";
import { logActivity } from "@/lib/activity-log";
import { canCreateRole, canManageUser } from "@/lib/authorization";
import type { CreateUserInput } from "@/validations/user";
import type { SessionUser } from "@/types";

export async function listUsers(actor: SessionUser) {
  if (actor.role === "ADMIN") {
    return prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        createdById: true,
        createdBy: { select: { name: true } },
      },
    });
  }

  return prisma.user.findMany({
    where: {
      createdById: actor.id,
      role: "ATTENDANCE_VOLUNTEER",
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      createdById: true,
      createdBy: { select: { name: true } },
    },
  });
}

export async function createUser(input: CreateUserInput, actor: SessionUser) {
  if (!canCreateRole(actor.role, input.role)) {
    throw new AppError(
      "You do not have permission to perform this action.",
      403,
      "FORBIDDEN",
    );
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: await hashPassword(input.temporaryPassword),
        role: input.role,
        active: input.active,
        createdById: actor.id,
      },
    });
    await logActivity({
      userId: actor.id,
      action: "USER_CREATED",
      entityType: "User",
      entityId: user.id,
      message: `${actor.name} created ${input.role} account for ${input.name}`,
    });
    return { id: user.id, email: user.email, role: user.role };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("A user with this email already exists.", 409, "DUPLICATE");
    }
    throw error;
  }
}

export async function setUserActive(
  id: string,
  active: boolean,
  actor: SessionUser,
) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    throw new AppError("User not found.", 404, "NOT_FOUND");
  }
  if (target.role === "ADMIN" && actor.role !== "ADMIN") {
    throw new AppError(
      "You do not have permission to perform this action.",
      403,
      "FORBIDDEN",
    );
  }
  if (!canManageUser(actor, target) && !(actor.role === "ADMIN" && target.role !== "ADMIN")) {
    throw new AppError(
      "You do not have permission to perform this action.",
      403,
      "FORBIDDEN",
    );
  }
  if (target.id === actor.id && !active) {
    throw new AppError("You cannot deactivate your own account.", 400, "SELF");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { active },
  });
  await logActivity({
    userId: actor.id,
    action: active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    entityType: "User",
    entityId: id,
    message: `${actor.name} ${active ? "activated" : "deactivated"} ${target.name}`,
  });
  return updated;
}

export function assertAssignableRole(actorRole: UserRole, targetRole: UserRole) {
  if (!canCreateRole(actorRole, targetRole)) {
    throw new AppError(
      "You do not have permission to perform this action.",
      403,
      "FORBIDDEN",
    );
  }
}
