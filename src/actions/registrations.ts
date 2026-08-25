"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/session";
import {
  cancelRegistration,
  joinWaitlist,
  registerForEvent,
  registerWalkIn,
} from "@/services/registrations";
import { AppError, logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";

export async function registerEventAction(eventId: string): Promise<ActionResult> {
  try {
    const user = await requireRoleAction(["MEMBER"]);
    if (!user.memberId) throw new AppError("Member profile not found.");
    await registerForEvent(eventId, user.memberId);
    revalidatePath("/portal");
    revalidatePath("/portal/events");
    return { ok: true, message: "You're registered." };
  } catch (error) {
    if (error instanceof AppError && error.userMessage === "SPOTS_FULL") {
      return { ok: false, error: "SPOTS_FULL" };
    }
    logServerError("registerEventAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to register.") };
  }
}

export async function joinWaitlistAction(eventId: string): Promise<ActionResult> {
  try {
    const user = await requireRoleAction(["MEMBER"]);
    if (!user.memberId) throw new AppError("Member profile not found.");
    await joinWaitlist(eventId, user.memberId);
    revalidatePath("/portal");
    return { ok: true, message: "You're on the waitlist." };
  } catch (error) {
    logServerError("joinWaitlistAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to join the waitlist.") };
  }
}

export async function cancelRegistrationAction(eventId: string): Promise<ActionResult> {
  try {
    const user = await requireRoleAction(["MEMBER"]);
    if (!user.memberId) throw new AppError("Member profile not found.");
    await cancelRegistration(eventId, user.memberId);
    revalidatePath("/portal");
    revalidatePath("/portal/events");
    return { ok: true, message: "Registration cancelled." };
  } catch (error) {
    logServerError("cancelRegistrationAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to cancel.") };
  }
}

export async function walkInRegisterAction(eventId: string, token: string): Promise<ActionResult<{ full?: boolean }>> {
  try {
    const user = await requireRoleAction(["MEMBER"]);
    if (!user.memberId) throw new AppError("Member profile not found.");
    const result = await registerWalkIn(eventId, user.memberId, token);
    revalidatePath("/portal");
    if (result.full) return { ok: true, data: { full: true } };
    return { ok: true, message: "You're registered as a walk-in." };
  } catch (error) {
    logServerError("walkInRegisterAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to complete walk-in registration.") };
  }
}
