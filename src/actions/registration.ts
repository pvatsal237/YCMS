"use server";

import { revalidatePath } from "next/cache";
import { requireCoordinator, requireMemberSession } from "@/lib/session";
import { cancelRegistration, checkInMember, registerForEvent, registerWalkIn } from "@/services/registration";
import { logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";

export async function registerEventAction(formData: FormData) {
  try {
    const user = await requireMemberSession();
    await registerForEvent(user, String(formData.get("eventId") ?? ""));
    revalidatePath("/home");
    revalidatePath("/my-events");
  } catch (error) {
    logServerError("registerEventAction", error);
  }
}

export async function cancelEventAction(formData: FormData) {
  try {
    const user = await requireMemberSession();
    await cancelRegistration(user, String(formData.get("eventId") ?? ""));
    revalidatePath("/home");
    revalidatePath("/my-events");
  } catch (error) {
    logServerError("cancelEventAction", error);
  }
}

export async function walkInAction(
  _prev: ActionResult<{ full?: boolean }>,
  formData: FormData,
): Promise<ActionResult<{ full?: boolean }>> {
  try {
    const user = await requireMemberSession();
    const result = await registerWalkIn(user, String(formData.get("eventId") ?? ""));
    revalidatePath("/walk-in");
    if (result.kind === "FULL") {
      return {
        ok: true,
        data: { full: true },
        message: "Today's event is full, but your profile is ready for future events.",
      };
    }
    return { ok: true, message: result.kind === "ALREADY" ? "You are already registered." : "Walk-in registration saved." };
  } catch (error) {
    logServerError("walkInAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to complete walk-in registration.") };
  }
}

export async function checkInAction(formData: FormData) {
  try {
    const actor = await requireCoordinator();
    await checkInMember(actor, String(formData.get("registrationId") ?? ""));
    revalidatePath("/events");
  } catch (error) {
    logServerError("checkInAction", error);
  }
}
