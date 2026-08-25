"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRoleAction } from "@/lib/session";
import { eventFormSchema } from "@/validations/forms";
import { createEvent, publishEvent, setEventStatus, updateEvent } from "@/services/events";
import { parseDateOnly } from "@/lib/dates";
import { logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";
import type { EventStatus } from "@prisma/client";

export async function createEventAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction(["COORDINATOR"]);
    const parsed = eventFormSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
    }
    const event = await createEvent(parsed.data, actor);
    revalidatePath("/events");
    revalidatePath("/dashboard");
    redirect(`/events/${event.id}`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    logServerError("createEventAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to create the event.") };
  }
}

export async function updateEventAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireRoleAction(["COORDINATOR"]);
    const parsed = eventFormSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
    }
    await updateEvent(id, {
      title: parsed.data.title,
      description: parsed.data.description,
      speakerName: parsed.data.speakerName || null,
      speakerTitle: parsed.data.speakerTitle || null,
      speakerOrganization: parsed.data.speakerOrganization || null,
      eventDate: parseDateOnly(parsed.data.eventDate),
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      location: parsed.data.location,
      capacity: parsed.data.capacity,
      registrationDeadline: parsed.data.registrationDeadline
        ? new Date(parsed.data.registrationDeadline)
        : undefined,
      walkInCapacity: parsed.data.walkInCapacity,
      checkInOpensAt: parsed.data.checkInOpensAt || "08:00",
      internalNotes: parsed.data.internalNotes || null,
    });
    revalidatePath(`/events/${id}`);
    return { ok: true, message: "Event updated." };
  } catch (error) {
    logServerError("updateEventAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to update the event.") };
  }
}

export async function publishEventAction(id: string): Promise<ActionResult> {
  try {
    await requireRoleAction(["COORDINATOR"]);
    await publishEvent(id);
    revalidatePath("/events");
    revalidatePath("/dashboard");
    revalidatePath("/portal");
    return { ok: true, message: "Event published and members notified." };
  } catch (error) {
    logServerError("publishEventAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to publish the event.") };
  }
}

export async function setEventStatusAction(id: string, status: EventStatus): Promise<ActionResult> {
  try {
    await requireRoleAction(["COORDINATOR"]);
    await setEventStatus(id, status);
    revalidatePath("/events");
    revalidatePath(`/events/${id}`);
    return { ok: true, message: "Event status updated." };
  } catch (error) {
    logServerError("setEventStatusAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to update status.") };
  }
}
