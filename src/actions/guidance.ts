"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/session";
import { guidanceSchema } from "@/validations/forms";
import {
  addGuidanceMessage,
  claimGuidanceRequest,
  createGuidanceRequest,
  resolveGuidanceRequest,
} from "@/services/guidance";
import { AppError, logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";
import type { GuidanceCategory } from "@prisma/client";

export async function createGuidanceAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRoleAction(["MEMBER"]);
    if (!user.memberId) throw new AppError("Member profile not found.");
    const parsed = guidanceSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
    }
    if (parsed.data.category === "OTHER" && !parsed.data.otherTopic) {
      return { ok: false, error: "What do you need guidance with?" };
    }
    await createGuidanceRequest({
      memberId: user.memberId,
      category: parsed.data.category as GuidanceCategory,
      otherTopic: parsed.data.otherTopic,
      message: parsed.data.message,
    });
    revalidatePath("/portal/guidance");
    return { ok: true, message: "Request submitted. A coordinator will follow up." };
  } catch (error) {
    logServerError("createGuidanceAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to submit your request.") };
  }
}

export async function claimGuidanceAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireRoleAction(["COORDINATOR"]);
    await claimGuidanceRequest(id, user.id);
    revalidatePath("/guidance");
    revalidatePath(`/guidance/${id}`);
    return { ok: true, message: "Request claimed." };
  } catch (error) {
    logServerError("claimGuidanceAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to claim this request.") };
  }
}

export async function sendGuidanceMessageAction(
  requestId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireRoleAction(["COORDINATOR", "MEMBER"]);
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return { ok: false, error: "Write a short message." };
    await addGuidanceMessage({
      requestId,
      authorId: user.id,
      body,
      asCoordinator: user.role === "COORDINATOR",
    });
    revalidatePath(`/guidance/${requestId}`);
    revalidatePath("/portal/guidance");
    return { ok: true };
  } catch (error) {
    logServerError("sendGuidanceMessageAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to send message.") };
  }
}

export async function resolveGuidanceAction(id: string): Promise<ActionResult> {
  try {
    await requireRoleAction(["COORDINATOR"]);
    await resolveGuidanceRequest(id);
    revalidatePath("/guidance");
    revalidatePath(`/guidance/${id}`);
    return { ok: true, message: "Marked resolved." };
  } catch (error) {
    logServerError("resolveGuidanceAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to resolve.") };
  }
}
