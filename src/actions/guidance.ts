"use server";

import { revalidatePath } from "next/cache";
import { requireCoordinator, requireRoleAction } from "@/lib/session";
import {
  addGuidanceMessage,
  cancelGuidanceRequest,
  claimGuidance,
  createGuidanceRequest,
  releaseGuidance,
  updateGuidanceStatus,
} from "@/services/guidance";
import { isNextInterruptError, logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";
import type { GuidanceCategory, GuidanceStatus } from "@prisma/client";

export async function createGuidanceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRoleAction(["MEMBER"]);
    await createGuidanceRequest(user, {
      category: String(formData.get("category") ?? "") as GuidanceCategory,
      customTopic: String(formData.get("customTopic") ?? "") || undefined,
      message: String(formData.get("message") ?? ""),
    });
    revalidatePath("/request-guidance");
    revalidatePath("/guidance");
    revalidatePath("/notifications");
    return { ok: true, message: "Your guidance request has been submitted." };
  } catch (error) {
    if (isNextInterruptError(error)) throw error;
    logServerError("createGuidanceAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to send your request.") };
  }
}

export async function cancelGuidanceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRoleAction(["MEMBER"]);
    await cancelGuidanceRequest(user, String(formData.get("id") ?? ""));
    revalidatePath("/request-guidance");
    revalidatePath("/guidance");
    return { ok: true, message: "Guidance request cancelled." };
  } catch (error) {
    if (isNextInterruptError(error)) throw error;
    logServerError("cancelGuidanceAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to cancel this request.") };
  }
}

function revalidateGuidancePaths() {
  try {
    revalidatePath("/guidance");
    revalidatePath("/request-guidance");
    revalidatePath("/notifications");
    revalidatePath("/dashboard");
  } catch (error) {
    logServerError("guidance.revalidate", error);
  }
}

export async function claimGuidanceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction(["COORDINATOR"]);
    await claimGuidance(actor, String(formData.get("id") ?? ""));
    revalidateGuidancePaths();
    return { ok: true, message: "Request claimed." };
  } catch (error) {
    if (isNextInterruptError(error)) throw error;
    logServerError("claimGuidanceAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to claim this request.") };
  }
}

export async function releaseGuidanceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction(["COORDINATOR"]);
    await releaseGuidance(actor, String(formData.get("id") ?? ""));
    revalidateGuidancePaths();
    return { ok: true, message: "Request released to the coordinator queue." };
  } catch (error) {
    if (isNextInterruptError(error)) throw error;
    logServerError("releaseGuidanceAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to release this request.") };
  }
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
    revalidatePath("/notifications");
  } catch (error) {
    if (isNextInterruptError(error)) throw error;
    logServerError("guidanceMessageAction", error);
  }
}
