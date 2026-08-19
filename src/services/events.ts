import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { parseDateOnly } from "@/lib/dates";
import { createStaffNotification } from "@/services/staff-notifications";
import { isTransportationAssignee, isTransportationLead } from "@/services/volunteer";
import { ensureVolunteerEnrollmentSchema } from "@/lib/volunteer-enrollment-schema";
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
  const duplicate = await prisma.rideRequest.findFirst({
    where: {
      memberId: member.id,
      meetupId: input.meetupId,
      status: { in: ["REQUESTED", "APPROVED", "ASSIGNED"] },
    },
  });
  if (duplicate) {
    throw new AppError("You already have a ride request for this event.", 400);
  }
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
  const leadIds = transport?.members.filter((row) => row.responsibility === "LEAD").map((row) => row.userId) ?? [];
  const notifyIds = [
    ...leadIds,
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

export async function cancelOwnRideRequest(actor: SessionUser, rideId: string) {
  if (actor.role !== "MEMBER") throw new AppError("You do not have permission to perform this action.", 403);
  const member = await prisma.member.findFirst({ where: { email: actor.email, active: true } });
  if (!member) throw new AppError("You do not have permission to perform this action.", 403);
  const existing = await prisma.rideRequest.findFirst({
    where: { id: rideId, memberId: member.id },
    include: { meetup: true, driver: true },
  });
  if (!existing) throw new AppError("Ride request not found.", 404);
  if (!["REQUESTED", "APPROVED", "ASSIGNED"].includes(existing.status)) {
    throw new AppError("This ride request can no longer be cancelled.", 400);
  }
  const updated = await prisma.rideRequest.update({
    where: { id: rideId },
    data: { status: "CANCELLED", driverUserId: null },
  });
  const transport = await prisma.volunteerDepartment.findFirst({
    where: { code: "TRANSPORTATION" },
    include: { members: true },
  });
  const leadIds = transport?.members.filter((row) => row.responsibility === "LEAD").map((row) => row.userId) ?? [];
  const notifyIds = [
    ...leadIds,
    ...(existing.driverUserId ? [existing.driverUserId] : []),
    ...(
      await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "COORDINATOR"] }, active: true },
        select: { id: true },
      })
    ).map((row) => row.id),
  ];
  await Promise.all(
    [...new Set(notifyIds)].map((userId) =>
      createStaffNotification({
        userId,
        memberId: member.id,
        requestId: existing.id,
        title: "Ride request cancelled",
        message: `${member.firstName} ${member.lastName} cancelled their ride request for ${existing.meetup.title}.`,
      }),
    ),
  );
  return updated;
}

export async function listMemberRideRequests(memberId: string) {
  return prisma.rideRequest.findMany({
    where: { memberId },
    include: { meetup: true, driver: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listRideRequestsForStaff(actor: SessionUser) {
  await ensureVolunteerEnrollmentSchema();
  const isTransportVol = actor.role === "ATTENDANCE_VOLUNTEER" && (await isTransportationAssignee(actor.id));
  if (actor.role !== "ADMIN" && actor.role !== "COORDINATOR" && !isTransportVol) {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
  const lead = actor.role !== "ATTENDANCE_VOLUNTEER" || (await isTransportationLead(actor.id));
  try {
    return await prisma.rideRequest.findMany({
      where: lead ? {} : { driverUserId: actor.id, status: { in: ["ASSIGNED", "APPROVED"] } },
      include: {
        meetup: true,
        member: { select: { id: true, firstName: true, lastName: true, phone: true } },
        driver: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

export async function reviewRideRequest(actor: SessionUser, id: string, status: "APPROVED" | "CANCELLED" | "REJECTED") {
  if (actor.role !== "ADMIN" && actor.role !== "COORDINATOR" && !(await isTransportationLead(actor.id))) {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
  const existing = await prisma.rideRequest.findUnique({
    where: { id },
    include: { member: true, meetup: true },
  });
  if (!existing) throw new AppError("Ride request not found.", 404);
  const updated = await prisma.rideRequest.update({ where: { id }, data: { status } });
  const memberUser = await prisma.user.findFirst({ where: { memberId: existing.memberId } });
  if (memberUser) {
    await createStaffNotification({
      userId: memberUser.id,
      memberId: existing.memberId,
      requestId: id,
      title: status === "APPROVED" ? "Ride request approved" : "Ride request update",
      message:
        status === "APPROVED"
          ? `Your ride request for ${existing.meetup.title} was approved. A driver will be assigned next.`
          : `Your ride request for ${existing.meetup.title} could not be filled this time. You are welcome to request again if you still need a ride.`,
    });
  }
  return updated;
}

export async function listEligibleRideDrivers(actor: SessionUser, meetupId: string) {
  await ensureVolunteerEnrollmentSchema();
  if (actor.role !== "ADMIN" && actor.role !== "COORDINATOR" && !(await isTransportationLead(actor.id))) {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
  const members = await prisma.volunteerDepartmentMembership.findMany({
    where: { department: { code: "TRANSPORTATION" } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          active: true,
        },
      },
    },
  });
  let availabilityRows: Array<{
    userId: string;
    status: "AVAILABLE" | "PARTIAL" | "NOT_AVAILABLE";
    startTime: string | null;
    endTime: string | null;
    passengerCapacity: number | null;
    note: string | null;
  }> = [];
  try {
    availabilityRows = await prisma.transportEventAvailability.findMany({
      where: { meetupId },
      select: {
        userId: true,
        status: true,
        startTime: true,
        endTime: true,
        passengerCapacity: true,
        note: true,
      },
    });
  } catch {
    availabilityRows = [];
  }
  const availabilityByUser = new Map(availabilityRows.map((row) => [row.userId, row]));
  return members
    .filter((row) => row.user.active)
    .map((row) => {
      const availability = availabilityByUser.get(row.user.id);
      return {
        id: row.user.id,
        name: row.user.name,
        phone: row.user.phone,
        availability: availability?.status ?? null,
        startTime: availability?.startTime ?? null,
        endTime: availability?.endTime ?? null,
        passengerCapacity: availability?.passengerCapacity ?? null,
        note: availability?.note ?? null,
        eligible: availability?.status !== "NOT_AVAILABLE",
      };
    })
    .filter((row) => row.eligible);
}

export async function assignRideToDriver(actor: SessionUser, rideId: string, driverUserId: string) {
  if (actor.role !== "ADMIN" && actor.role !== "COORDINATOR" && !(await isTransportationLead(actor.id))) {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
  const existing = await prisma.rideRequest.findUnique({
    where: { id: rideId },
    include: { meetup: true, member: true },
  });
  if (!existing || !["APPROVED", "ASSIGNED"].includes(existing.status)) {
    throw new AppError("Approve this ride before assigning a driver.", 400);
  }
  const drivers = await listEligibleRideDrivers(actor, existing.meetupId);
  const driver = drivers.find((row) => row.id === driverUserId);
  if (!driver) {
    throw new AppError("Please choose an available Transportation volunteer.", 400);
  }
  if (driver.passengerCapacity && existing.passengerCount > driver.passengerCapacity) {
    throw new AppError("This volunteer does not have enough passenger capacity for this ride.", 400);
  }
  const { assertRideAcceptAllowed } = await import("@/services/volunteer");
  await assertRideAcceptAllowed(driverUserId, existing.meetup);
  const updated = await prisma.rideRequest.update({
    where: { id: rideId },
    data: { status: "ASSIGNED", driverUserId },
    include: { member: true, driver: true, meetup: true },
  });
  const memberUser = await prisma.user.findFirst({ where: { memberId: updated.memberId } });
  if (memberUser) {
    await createStaffNotification({
      userId: memberUser.id,
      memberId: updated.memberId,
      requestId: updated.id,
      title: "Your ride has been confirmed.",
      message: [
        `Driver: ${updated.driver?.name ?? "A volunteer"}`,
        updated.driver?.phone ? `Driver phone: ${updated.driver.phone}` : null,
        `Pickup: ${updated.pickupArea}`,
        `Available after: ${updated.availableAfter}`,
        `Event: ${updated.meetup.title}`,
        "If the driver does not answer, please leave a voicemail with your name and callback number.",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }
  await createStaffNotification({
    userId: driverUserId,
    memberId: updated.memberId,
    requestId: updated.id,
    title: "New Ride Assignment",
    message: [
      `Member: ${updated.member.firstName} ${updated.member.lastName}`,
      `Pickup: ${updated.pickupArea}`,
      `Available after: ${updated.availableAfter}`,
      `Passengers: ${updated.passengerCount}`,
      `Phone: ${updated.member.phone}`,
      `Event: ${updated.meetup.title}`,
      updated.note ? `Notes: ${updated.note}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  });
  return updated;
}

export async function saveTransportAvailability(
  actor: SessionUser,
  input: {
    meetupId: string;
    status: "AVAILABLE" | "PARTIAL" | "NOT_AVAILABLE";
    startTime?: string;
    endTime?: string;
    passengerCapacity?: number;
    note?: string;
  },
) {
  if (!(await isTransportationAssignee(actor.id)) && actor.role !== "ADMIN" && actor.role !== "COORDINATOR") {
    throw new AppError("Only Transportation volunteers can share this availability.", 403);
  }
  if (input.status === "PARTIAL" && (!input.startTime || !input.endTime)) {
    throw new AppError("Partial availability needs Available From and Available Until.", 400);
  }
  return prisma.transportEventAvailability.upsert({
    where: { userId_meetupId: { userId: actor.id, meetupId: input.meetupId } },
    create: {
      userId: actor.id,
      meetupId: input.meetupId,
      status: input.status,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      passengerCapacity: input.passengerCapacity || null,
      note: input.note?.trim() || null,
    },
    update: {
      status: input.status,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      passengerCapacity: input.passengerCapacity || null,
      note: input.note?.trim() || null,
    },
  });
}

export async function acceptRideRequest(actor: SessionUser, id: string) {
  const existing = await prisma.rideRequest.findUnique({
    where: { id },
    include: { meetup: true },
  });
  if (!existing || existing.status !== "APPROVED") {
    throw new AppError("This ride is not available to accept.", 400);
  }
  if (existing.driverUserId) {
    throw new AppError("This ride is already assigned.", 400);
  }
  if (actor.role !== "ADMIN" && actor.role !== "COORDINATOR" && !(await isTransportationAssignee(actor.id))) {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
  const { assertRideAcceptAllowed } = await import("@/services/volunteer");
  await assertRideAcceptAllowed(actor.id, existing.meetup);
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
