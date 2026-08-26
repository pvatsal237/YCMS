"use server";

import { revalidatePath } from "next/cache";
import { requireCoordinator, requireMemberSession, requireRoleAction } from "@/lib/session";
import {
  addGuidanceMessage,
  claimGuidance,
  createGuidanceRequest,
  updateGuidanceStatus,
} from "@/services/guidance";
import { logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";
import type { GuidanceCategory, GuidanceStatus } from "@prisma/client";

export async function createGuidanceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireMemberSession();
    await createGuidanceRequest(user, {
      category: String(formData.get("category") ?? "") as GuidanceCategory,
      customTopic: String(formData.get("customTopic") ?? "") || undefined,
      message: String(formData.get("message") ?? ""),
    });
    revalidatePath("/request-guidance");
    revalidatePath("/guidance");
    revalidatePath("/notifications");
    return { ok: true, message: "Your request was sent to coordinators." };
  } catch (error) {
    logServerError("createGuidanceAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to send your request.") };
  }
}

export async function claimGuidanceAction(formData: FormData) {
  const actor = await requireCoordinator();
  await claimGuidance(actor, String(formData.get("id") ?? ""));
  revalidatePath("/guidance");
}

export async function guidanceStatusAction(formData: FormData) {
  const actor = await requireCoordinator();
  await updateGuidanceStatus(
    actor,
    String(formData.get("id") ?? ""),
    String(formData.get("status") ?? "") as GuidanceStatus,
  );
  revalidatePath("/guidance");
}

export async function guidanceMessageAction(formData: FormData) {
  try {
    const actor = await requireRoleAction(["COORDINATOR", "MEMBER"]);
    await addGuidanceMessage(actor, String(formData.get("id") ?? ""), String(formData.get("body") ?? ""));
    revalidatePath("/guidance");
    revalidatePath("/request-guidance");
  } catch (error) {
    logServerError("guidanceMessageAction", error);
  }
}
