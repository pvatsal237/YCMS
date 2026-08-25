"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/session";
import { memberProfileSchema, feedbackSchema } from "@/validations/forms";
import { updateMemberProfile, globalMemberSearch } from "@/services/members";
import { prisma } from "@/lib/prisma";
import { AppError, logServerError, toUserMessage } from "@/lib/errors";
import { markNotificationsRead } from "@/services/notifications";
import type { ActionResult } from "@/types";

export async function updateProfileAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRoleAction(["MEMBER"]);
    if (!user.memberId) throw new AppError("Member profile not found.");
    const parsed = memberProfileSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid." };
    await updateMemberProfile(user.memberId, parsed.data);
    revalidatePath("/portal/profile");
    return { ok: true, message: "Profile updated." };
  } catch (error) {
    logServerError("updateProfileAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to update profile.") };
  }
}

export async function submitFeedbackAction(eventId: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRoleAction(["MEMBER"]);
    if (!user.memberId) throw new AppError("Member profile not found.");
    const parsed = feedbackSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { ok: false, error: "Choose a rating from 1 to 5." };
    await prisma.eventFeedback.upsert({
      where: { eventId_memberId: { eventId, memberId: user.memberId } },
      update: { rating: parsed.data.rating, comment: parsed.data.comment || null },
      create: {
        eventId,
        memberId: user.memberId,
        rating: parsed.data.rating,
        comment: parsed.data.comment || null,
      },
    });
    revalidatePath("/portal/events");
    return { ok: true, message: "Thanks for the feedback." };
  } catch (error) {
    logServerError("submitFeedbackAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to save feedback.") };
  }
}

export async function markNotificationsReadAction() {
  const user = await requireRoleAction(["COORDINATOR", "MEMBER"]);
  await markNotificationsRead(user.id);
  revalidatePath("/notifications");
  revalidatePath("/portal/notifications");
}

export async function searchMembersAction(query: string) {
  await requireRoleAction(["COORDINATOR"]);
  return globalMemberSearch(query);
}
