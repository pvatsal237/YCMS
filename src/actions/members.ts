"use server";

import { revalidatePath } from "next/cache";
import { requireMemberSession } from "@/lib/session";
import { submitFeedback, updateMemberProfile } from "@/services/members";
import { logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";

export async function updateProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireMemberSession();
    await updateMemberProfile(user, {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      phone: String(formData.get("phone") ?? "") || undefined,
      emergencyContactName: String(formData.get("emergencyContactName") ?? "") || undefined,
      emergencyContactPhone: String(formData.get("emergencyContactPhone") ?? "") || undefined,
    });
    revalidatePath("/profile");
    return { ok: true, message: "Profile saved." };
  } catch (error) {
    logServerError("updateProfileAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to save profile.") };
  }
}

export async function feedbackAction(formData: FormData) {
  try {
    const user = await requireMemberSession();
    await submitFeedback(
      user,
      String(formData.get("eventId") ?? ""),
      Number(formData.get("rating") ?? 0),
      String(formData.get("comment") ?? "") || undefined,
    );
    revalidatePath("/my-events");
  } catch (error) {
    logServerError("feedbackAction", error);
  }
}

export async function searchMembersAction(query: string) {
  const { requireCoordinator } = await import("@/lib/session");
  await requireCoordinator();
  const { listMembers } = await import("@/services/members");
  const rows = await listMembers(query);
  return rows.slice(0, 8).map((row) => ({
    id: row.id,
    name: `${row.firstName} ${row.lastName}`,
    email: row.email,
    phone: row.phone,
  }));
}
