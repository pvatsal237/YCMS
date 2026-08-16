"use server";

import { revalidatePath } from "next/cache";
import { requireMemberSession, requireRoleAction } from "@/lib/session";
import { createAssistanceRequest, updateAssistanceRequest } from "@/services/assistance";
import {
  createAssistanceRequestSchema,
  updateAssistanceRequestSchema,
} from "@/validations/assistance";
import { logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";

export async function createAssistanceRequestAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireMemberSession();
    const parsed = createAssistanceRequestSchema.safeParse({
      category: formData.get("category"),
      documentId: formData.get("documentId") || undefined,
      requestedRole: formData.get("requestedRole"),
      requestedUserId: formData.get("requestedUserId") || undefined,
      urgency: formData.get("urgency"),
      impact: formData.get("impact"),
      preferredResponseBy: formData.get("preferredResponseBy") || undefined,
      memberNote: formData.get("memberNote") || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
    }
    await createAssistanceRequest(actor, parsed.data);
    revalidatePath("/portal");
    revalidatePath("/assistance");
    revalidatePath("/dashboard");
    revalidatePath("/notifications");
    return { ok: true, message: "Your assistance request was submitted." };
  } catch (error) {
    logServerError("createAssistanceRequestAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to submit that request.") };
  }
}

export async function updateAssistanceRequestAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction(["ADMIN", "COORDINATOR"]);
    const parsed = updateAssistanceRequestSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
      assignedToId: formData.get("assignedToId") || undefined,
      internalNote: formData.get("internalNote") || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Unable to update that request." };
    }
    await updateAssistanceRequest(actor, parsed.data);
    revalidatePath("/assistance");
    revalidatePath(`/assistance/${parsed.data.id}`);
    revalidatePath("/dashboard");
    return { ok: true, message: "Request updated." };
  } catch (error) {
    logServerError("updateAssistanceRequestAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to update that request.") };
  }
}
