"use server";

import { revalidatePath } from "next/cache";
import { requireMemberSession, requireRoleAction } from "@/lib/session";
import {
  createDocumentRenewalRequest,
  createProfileChangeRequest,
  reviewDocumentRequest,
} from "@/services/member-portal";
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

export async function requestDocumentRenewalAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireMemberSession();
    const documentId = String(formData.get("documentId") ?? "");
    const requestType = String(formData.get("requestType") ?? "");
    const assignedToUserId = String(formData.get("assignedToUserId") ?? "");
    const proposedExpiry = String(formData.get("proposedExpiry") ?? "").trim();
    const allowed = [
      "NEED_ASSISTANCE",
      "RENEWAL_REQUESTED",
      "RENEWED",
      "IRCC_QUERY",
    ] as const;
    if (!allowed.includes(requestType as (typeof allowed)[number])) {
      return { ok: false, error: "Choose a status from the list." };
    }
    if (!assignedToUserId) {
      return { ok: false, error: "Select who you want to speak with." };
    }
    await createDocumentRenewalRequest(actor, {
      documentId,
      requestType: requestType as (typeof allowed)[number],
      assignedToUserId,
      proposedExpiry: requestType === "RENEWED" ? proposedExpiry : undefined,
    });
    revalidatePath("/portal");
    revalidatePath("/notifications");
    revalidatePath("/immigration");
    return {
      ok: true,
      message:
        "Your update was saved. The person you selected was notified in YCMS and by email. You can change this later if you picked the wrong option.",
    };
  } catch (error) {
    logServerError("requestDocumentRenewalAction", error);
    return { ok: false, error: "Unable to save that request." };
  }
}

export async function reviewDocumentRequestAction(
  requestId: string,
  decision: "APPROVED" | "REJECTED",
): Promise<ActionResult> {
  try {
    await requireRoleAction(["ADMIN", "COORDINATOR"]);
    await reviewDocumentRequest(requestId, decision);
    revalidatePath("/immigration");
    revalidatePath("/portal");
    return { ok: true, message: decision === "APPROVED" ? "Request approved." : "Request rejected." };
  } catch (error) {
    logServerError("reviewDocumentRequestAction", error);
    return { ok: false, error: "Unable to update that request." };
  }
}
