"use server";

import { revalidatePath } from "next/cache";
import { requireMemberSession, requireStaffSession } from "@/lib/session";
import { reviewEnrollment, submitVolunteerInterests, type EnrollmentInterestInput } from "@/services/enrollment";
import { logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";
import type { VolunteerDepartmentCode, VolunteerInterestKind, VolunteerResponseStatus } from "@prisma/client";

export async function submitVolunteerInterestAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireMemberSession();
    const departments = formData.getAll("departmentCode").map(String) as VolunteerDepartmentCode[];
    const wherever = formData.get("wherever") === "on";
    const unsure = formData.get("unsure") === "on";
    const availability = String(formData.get("availability") ?? "AVAILABLE") as VolunteerResponseStatus;
    const shared = {
      availability,
      availableFrom: String(formData.get("availableFrom") ?? "") || undefined,
      availableUntil: String(formData.get("availableUntil") ?? "") || undefined,
      notes: String(formData.get("notes") ?? "") || undefined,
      isNewVolunteer: formData.get("isNewVolunteer") === "on",
      canHelpWherever: wherever,
      oneTime: formData.get("oneTime") === "on",
    };
    const interests: EnrollmentInterestInput[] = departments.map((departmentCode) => ({
      ...shared,
      notes: String(formData.get(`notes_${departmentCode}`) ?? "") || shared.notes,
      departmentCode,
      interestKind: "DEPARTMENT" as VolunteerInterestKind,
    }));
    if (wherever) {
      interests.push({ ...shared, interestKind: "WHEREVER", canHelpWherever: true });
    }
    if (unsure) {
      interests.push({ ...shared, interestKind: "UNSURE" });
    }
    await submitVolunteerInterests(actor, interests);
    revalidatePath("/portal");
    revalidatePath("/volunteer");
    revalidatePath("/volunteers");
    revalidatePath("/notifications");
    return { ok: true, message: "Thank you. A department lead or coordinator will welcome you soon." };
  } catch (error) {
    logServerError("submitVolunteerInterestAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to save your interest.") };
  }
}

export async function reviewEnrollmentAction(
  id: string,
  decision: "APPROVED" | "REJECTED",
  departmentId?: string,
) {
  try {
    const actor = await requireStaffSession();
    await reviewEnrollment(actor, id, decision, departmentId);
    revalidatePath("/volunteer");
    revalidatePath("/volunteers");
    revalidatePath("/portal");
    revalidatePath("/notifications");
    return { ok: true, message: decision === "APPROVED" ? "Welcome sent." : "Request updated." } satisfies ActionResult;
  } catch (error) {
    logServerError("reviewEnrollmentAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to review this request.") } satisfies ActionResult;
  }
}

export async function reviewEnrollmentFormAction(formData: FormData) {
  await reviewEnrollmentAction(
    String(formData.get("id") ?? ""),
    String(formData.get("decision") ?? "REJECTED") as "APPROVED" | "REJECTED",
    String(formData.get("departmentId") ?? "") || undefined,
  );
}
