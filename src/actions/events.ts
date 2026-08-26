"use server";

import { revalidatePath } from "next/cache";
import { requireCoordinator } from "@/lib/session";
import { createEvent, sendEventReminder, setEventStatus, updateEvent, type EventInput } from "@/services/events";
import { logServerError, toUserMessage } from "@/lib/errors";
import type { EventStatus } from "@prisma/client";
import type { ActionResult } from "@/types";

function formEvent(formData: FormData): EventInput {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    speakerName: String(formData.get("speakerName") ?? "") || undefined,
    speakerTitle: String(formData.get("speakerTitle") ?? "") || undefined,
    speakerOrganization: String(formData.get("speakerOrganization") ?? "") || undefined,
    eventDate: String(formData.get("eventDate") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    location: String(formData.get("location") ?? ""),
    capacity: Number(formData.get("capacity") ?? 0),
    walkInCapacity: Number(formData.get("walkInCapacity") ?? 10),
    registrationDeadline: String(formData.get("registrationDeadline") ?? "") || undefined,
    checkInOpensAt: String(formData.get("checkInOpensAt") ?? "") || undefined,
    internalNotes: String(formData.get("internalNotes") ?? "") || undefined,
    status: (String(formData.get("status") ?? "DRAFT") as EventStatus) || "DRAFT",
  };
}

export async function saveEventAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireCoordinator();
    const id = String(formData.get("id") ?? "");
    if (id) await updateEvent(actor, id, formEvent(formData));
    else await createEvent(actor, formEvent(formData));
    revalidatePath("/events");
    revalidatePath("/home");
    return { ok: true, message: "Event saved." };
  } catch (error) {
    logServerError("saveEventAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to save event.") };
  }
}

export async function setEventStatusAction(formData: FormData) {
  await requireCoordinator();
  await setEventStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "") as EventStatus);
  revalidatePath("/events");
}

export async function sendReminderAction(formData: FormData) {
  await requireCoordinator();
  await sendEventReminder(String(formData.get("id") ?? ""));
  revalidatePath("/events");
}
