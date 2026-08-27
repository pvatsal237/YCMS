"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCoordinator, requireRoleAction } from "@/lib/session";
import { createEvent, sendEventReminder, setEventStatus, updateEvent, type EventInput } from "@/services/events";
import { isNextInterruptError, logServerError, toUserMessage } from "@/lib/errors";
import { inspectEventTextFields, sanitizeEventFormData, sanitizeFormString } from "@/lib/sanitize-text";
import { logSafe } from "@/lib/log";
import type { EventStatus } from "@prisma/client";
import type { ActionResult } from "@/types";

function formInt(formData: FormData, name: string, fallback: number) {
  const raw = sanitizeFormString(formData.get(name));
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function formEvent(formData: FormData): EventInput {
  sanitizeEventFormData(formData);
  return {
    title: sanitizeFormString(formData.get("title")),
    description: sanitizeFormString(formData.get("description")),
    speakerName: sanitizeFormString(formData.get("speakerName")) || undefined,
    speakerTitle: sanitizeFormString(formData.get("speakerTitle")) || undefined,
    speakerOrganization: sanitizeFormString(formData.get("speakerOrganization")) || undefined,
    eventDate: sanitizeFormString(formData.get("eventDate")),
    startTime: sanitizeFormString(formData.get("startTime")),
    endTime: sanitizeFormString(formData.get("endTime")),
    location: sanitizeFormString(formData.get("location")),
    capacity: formInt(formData, "capacity", Number.NaN),
    walkInCapacity: formInt(formData, "walkInCapacity", 10),
    internalNotes: sanitizeFormString(formData.get("internalNotes")) || undefined,
    status: (sanitizeFormString(formData.get("status")) || "DRAFT") as EventStatus,
  };
}

export async function saveEventAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const payload = formEvent(formData);
  try {
    const actor = await requireRoleAction(["COORDINATOR"]);
    const id = sanitizeFormString(formData.get("id"));
    if (id) {
      await updateEvent(actor, id, payload);
      revalidatePath("/events");
      revalidatePath("/home");
      revalidatePath(`/events/${id}`);
      return { ok: true, message: "Event saved." };
    }
    await createEvent(actor, payload);
    revalidatePath("/events");
    revalidatePath("/home");
    redirect("/events");
  } catch (error) {
    if (isNextInterruptError(error)) throw error;
    const fields = inspectEventTextFields(payload as unknown as Record<string, unknown>);
    logSafe("event.save_failed", {
      hadNull: fields.some((field) => field.hadNull),
      fields,
    });
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
