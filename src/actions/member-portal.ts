"use server";

import { revalidatePath } from "next/cache";
import { requireMemberSession } from "@/lib/session";
import { createProfileChangeRequest } from "@/services/member-portal";
import { logServerError } from "@/lib/errors";
import type { ActionResult } from "@/types";

export async function requestProfileChangeAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireMemberSession();
    const message = String(formData.get("message") ?? "").trim();
    if (message.length < 8) {
      return { ok: false, error: "Describe the change you need in a short note." };
    }
    await createProfileChangeRequest(actor, message);
    revalidatePath("/portal");
    return {
      ok: true,
      message: "Your request was saved. A coordinator can review it later.",
    };
  } catch (error) {
    logServerError("requestProfileChangeAction", error);
    return { ok: false, error: "Unable to save that request." };
  }
}
