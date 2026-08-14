"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/session";
import { followUpUpdateSchema, logFollowUpSchema } from "@/validations/follow-up";
import { updateFollowUp, logFollowUpContact } from "@/services/follow-ups";
import { logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";

export async function updateFollowUpAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction(["ADMIN", "COORDINATOR"]);
    const parsed = followUpUpdateSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
      assignedToId: formData.get("assignedToId") || undefined,
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Unable to update follow-up." };
    }
    await updateFollowUp(parsed.data, actor);
    revalidatePath("/follow-ups");
    revalidatePath(`/follow-ups/${parsed.data.id}`);
    revalidatePath("/dashboard");
    return { ok: true, message: "Follow-up updated." };
  } catch (error) {
    logServerError("updateFollowUpAction", error);
    return {
      ok: false,
      error: toUserMessage(error, "Unable to update follow-up. Please try again."),
    };
  }
}

export async function logFollowUpAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction(["ADMIN", "COORDINATOR"]);
    const parsed = logFollowUpSchema.safeParse({
      id: formData.get("id"),
      outcome: formData.get("outcome"),
      notes: formData.get("notes") || undefined,
      nextFollowUpAt: formData.get("nextFollowUpAt") || undefined,
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Please choose what happened.",
      };
    }
    await logFollowUpContact(parsed.data, actor);
    revalidatePath("/follow-ups");
    revalidatePath(`/follow-ups/${parsed.data.id}`);
    revalidatePath("/dashboard");
    return { ok: true, message: "Follow-up saved." };
  } catch (error) {
    logServerError("logFollowUpAction", error);
    return {
      ok: false,
      error: toUserMessage(error, "Unable to update follow-up. Please try again."),
    };
  }
}
