"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/session";
import { checkInMember } from "@/services/checkin";
import { logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";

export async function checkInAction(eventId: string, memberId: string): Promise<ActionResult> {
  try {
    const user = await requireRoleAction(["COORDINATOR"]);
    await checkInMember(eventId, memberId, user.id);
    revalidatePath(`/events/${eventId}/check-in`);
    return { ok: true, message: "Checked in." };
  } catch (error) {
    logServerError("checkInAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to check in.") };
  }
}
