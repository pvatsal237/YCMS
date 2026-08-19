"use server";

import { revalidatePath } from "next/cache";
import { requireMemberSession, requireStaffSession } from "@/lib/session";
import {
  acceptRideRequest,
  createEvent,
  createRideRequest,
  reviewRideRequest,
} from "@/services/events";
import { logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";
import type { EventType } from "@prisma/client";

export async function createEventAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireStaffSession();
    await createEvent(actor, {
      title: String(formData.get("title") ?? ""),
      meetupDate: String(formData.get("meetupDate") ?? ""),
      location: String(formData.get("location") ?? ""),
      eventType: String(formData.get("eventType") ?? "WEEKLY_MEETUP") as EventType,
      startTime: String(formData.get("startTime") ?? "") || undefined,
      endTime: String(formData.get("endTime") ?? "") || undefined,
      topic: String(formData.get("topic") ?? "") || undefined,
      speakerName: String(formData.get("speakerName") ?? "") || undefined,
      speakerOrganization: String(formData.get("speakerOrganization") ?? "") || undefined,
      speakerPosition: String(formData.get("speakerPosition") ?? "") || undefined,
      careerSkillArea: String(formData.get("careerSkillArea") ?? "") || undefined,
      description: String(formData.get("description") ?? "") || undefined,
      expectedAttendance: Number(formData.get("expectedAttendance") ?? 0) || undefined,
    });
    revalidatePath("/events");
    revalidatePath("/portal");
    return { ok: true, message: "Event saved." };
  } catch (error) {
    logServerError("createEventAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to save event.") };
  }
}

export async function requestRideAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireMemberSession();
    await createRideRequest(actor, {
      meetupId: String(formData.get("meetupId") ?? ""),
      pickupArea: String(formData.get("pickupArea") ?? ""),
      availableAfter: String(formData.get("availableAfter") ?? ""),
      passengerCount: Number(formData.get("passengerCount") ?? 1),
      note: String(formData.get("note") ?? "") || undefined,
    });
    revalidatePath("/portal");
    revalidatePath("/transportation");
    return { ok: true, message: "Ride request submitted." };
  } catch (error) {
    logServerError("requestRideAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to submit ride request.") };
  }
}

export async function reviewRideAction(id: string, status: "APPROVED" | "CANCELLED") {
  try {
    const actor = await requireStaffSession();
    await reviewRideRequest(actor, id, status);
    revalidatePath("/transportation");
    return { ok: true, message: "Ride request updated." } satisfies ActionResult;
  } catch (error) {
    logServerError("reviewRideAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to update ride request.") } satisfies ActionResult;
  }
}

export async function acceptRideAction(id: string) {
  try {
    const actor = await requireStaffSession();
    await acceptRideRequest(actor, id);
    revalidatePath("/transportation");
    revalidatePath("/volunteer");
    return { ok: true, message: "Ride accepted." } satisfies ActionResult;
  } catch (error) {
    logServerError("acceptRideAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to accept ride.") } satisfies ActionResult;
  }
}

export async function createEventFormAction(formData: FormData) {
  await createEventAction({ ok: true }, formData);
}

export async function requestRideFormAction(formData: FormData) {
  await requestRideAction({ ok: true }, formData);
}
