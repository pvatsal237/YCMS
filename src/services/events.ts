import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { parseDateOnly } from "@/lib/dates";
import { createStaffNotification } from "@/services/staff-notifications";
import type { SessionUser } from "@/types";
import type { EventType } from "@prisma/client";

export async function listEvents() {
  return prisma.meetup.findMany({
    orderBy: { meetupDate: "desc" },
    take: 40,
  });
}

export async function listUpcomingEvents(take = 8) {
  return prisma.meetup.findMany({
    where: { active: true, meetupDate: { gte: parseDateOnly(new Date().toISOString().slice(0, 10)) } },
    orderBy: { meetupDate: "asc" },
    take,
  });
}

export async function createEvent(
  actor: SessionUser,
  input: {
    title: string;
    meetupDate: string;
    location: string;
    eventType: EventType;
    startTime?: string;
    endTime?: string;
    cuisine?: string;
    topic?: string;
    speakerName?: string;
    speakerOrganization?: string;
    speakerPosition?: string;
    careerSkillArea?: string;
    description?: string;
    expectedAttendance?: number;
  },
) {
  if (actor.role !== "ADMIN" && actor.role !== "COORDINATOR") {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
  return prisma.meetup.create({
    data: {
      title: input.title,
      meetupDate: parseDateOnly(input.meetupDate),
      location: input.location,
      eventType: input.eventType,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      cuisine: input.cuisine || null,
      topic: input.topic || null,
      speakerName: input.speakerName || null,
      speakerOrganization: input.speakerOrganization || null,
      speakerPosition: input.speakerPosition || null,
      careerSkillArea: input.careerSkillArea || null,
      description: input.description || null,
      expectedAttendance: input.expectedAttendance || null,
      createdById: actor.id,
    },
  });
}

export async function createRideRequest(
  actor: SessionUser,
  input: {
    meetupId: string;
    pickupArea: string;
    availableAfter: string;
    passengerCount: number;
    note?: string;
  },
) {
  if (actor.role !== "MEMBER") throw new AppError("You do not have permission to perform this action.", 403);
  const member = await prisma.member.findFirst({ where: { email: actor.email, active: true } });
  if (!member) throw new AppError("You do not have permission to perform this action.", 403);
  const request = await prisma.rideRequest.create({
    data: {
      memberId: member.id,
      meetupId: input.meetupId,
      pickupArea: input.pickupArea.trim(),
      availableAfter: input.availableAfter.trim(),
      passengerCount: input.passengerCount,
      note: input.note?.trim() || null,
    },
  });
  const transport = await prisma.volunteerDepartment.findFirst({
    where: { code: "TRANSPORTATION" },
    include: { members: true, lead: true },
  });
  const notifyIds = [
    ...(transport?.leadUserId ? [transport.leadUserId] : []),
    ...((await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "COORDINATOR"] }, active: true },
      select: { id: true },
    })).map((row) => row.id)),
  ];
  await Promise.all(
    [...new Set(notifyIds)].map((userId) =>
      createStaffNotification({
        userId,
        memberId: member.id,
        requestId: request.id,
        title: "Ride request",
        message: `${member.firstName} ${member.lastName} requested a ride.`,
      }),
    ),
  );
  return request;
}

export async function listMemberRideRequests(memberId: string) {
  return prisma.rideRequest.findMany({
    where: { memberId },
    include: { meetup: true, driver: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listRideRequestsForStaff(actor: SessionUser) {
  const isTransportVol =
    actor.role === "ATTENDANCE_VOLUNTEER" &&
    Boolean(
      await prisma.volunteerDepartmentMembership.findFirst({
        where: { userId: actor.id, department: { code: "TRANSPORTATION" } },
      }),
    );
  if (actor.role !== "ADMIN" && actor.role !== "COORDINATOR" && !isTransportVol) {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
  const lead =
    actor.role !== "ATTENDANCE_VOLUNTEER" ||
    Boolean(
      await prisma.volunteerDepartmentMembership.findFirst({
        where: { userId: actor.id, department: { code: "TRANSPORTATION" }, responsibility: "LEAD" },
      }),
    );
  return prisma.rideRequest.findMany({
    where: lead
      ? {}
      : { status: { in: ["APPROVED", "ASSIGNED"] } },
    include: {
      meetup: true,
      member: { select: { id: true, firstName: true, lastName: true, phone: true } },
      driver: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function reviewRideRequest(actor: SessionUser, id: string, status: "APPROVED" | "CANCELLED") {
  if (actor.role !== "ADMIN" && actor.role !== "COORDINATOR") {
    const lead = await prisma.volunteerDepartmentMembership.findFirst({
      where: { userId: actor.id, department: { code: "TRANSPORTATION" }, responsibility: "LEAD" },
    });
    if (!lead) throw new AppError("You do not have permission to perform this action.", 403);
  }
  return prisma.rideRequest.update({ where: { id }, data: { status } });
}

export async function acceptRideRequest(actor: SessionUser, id: string) {
  const existing = await prisma.rideRequest.findUnique({ where: { id } });
  if (!existing || existing.status !== "APPROVED") {
    throw new AppError("This ride is not available to accept.", 400);
  }
  if (existing.driverUserId) {
    throw new AppError("This ride is already assigned.", 400);
  }
  const membership = await prisma.volunteerDepartmentMembership.findFirst({
    where: { userId: actor.id, department: { code: "TRANSPORTATION" } },
  });
  if (!membership && actor.role !== "ADMIN" && actor.role !== "COORDINATOR") {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
  const updated = await prisma.rideRequest.update({
    where: { id },
    data: { status: "ASSIGNED", driverUserId: actor.id },
    include: { member: true, driver: true },
  });
  const memberUser = await prisma.user.findFirst({ where: { memberId: updated.memberId } });
  if (memberUser) {
    await createStaffNotification({
      userId: memberUser.id,
      memberId: updated.memberId,
      requestId: updated.id,
      title: "Ride assigned",
      message: `${updated.driver?.name ?? "A driver"} was assigned to your ride.`,
    });
  }
  return updated;
}
