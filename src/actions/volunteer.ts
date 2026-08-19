"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction, requireStaffSession } from "@/lib/session";
import {
  assignVolunteerDepartments,
  assignVolunteerToRequest,
  createStaffingRequest,
  respondToStaffingRequest,
  reviewDepartmentPlan,
  reviewStaffingRequest,
  saveDepartmentPlan,
  type KnownAssignment,
  type StaffingRequirementInput,
} from "@/services/volunteer";
import { logServerError, toUserMessage } from "@/lib/errors";
import { parseDateOnly } from "@/lib/dates";
import type { ActionResult } from "@/types";

export async function assignVolunteerDepartmentsAction(formData: FormData) {
  try {
    const actor = await requireRoleAction(["ADMIN", "COORDINATOR"]);
    const departmentIds = formData.getAll("departmentId").map(String);
    const leadDepartmentIds = formData.getAll("leadDepartmentId").map(String);
    await assignVolunteerDepartments(actor, {
      userId: String(formData.get("userId") ?? ""),
      departmentIds,
      leadDepartmentIds,
      phone: String(formData.get("phone") ?? "") || undefined,
      active: formData.get("active") === "on",
    });
    revalidatePath("/volunteers");
  } catch (error) {
    logServerError("assignVolunteerDepartmentsAction", error);
  }
}

export async function createStaffingRequestAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireStaffSession();
    await createStaffingRequest(actor, {
      meetupId: String(formData.get("meetupId") ?? ""),
      departmentId: String(formData.get("departmentId") ?? ""),
      task: String(formData.get("task") ?? ""),
      neededCount: Number(formData.get("neededCount") ?? 0),
      requestDate: parseDateOnly(String(formData.get("requestDate") ?? "")),
      startTime: String(formData.get("startTime") ?? ""),
      endTime: String(formData.get("endTime") ?? ""),
      notes: String(formData.get("notes") ?? "") || undefined,
    });
    revalidatePath("/volunteer");
    revalidatePath("/events");
    return { ok: true, message: "Staffing request submitted." };
  } catch (error) {
    logServerError("createStaffingRequestAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to create staffing request.") };
  }
}

export async function reviewStaffingRequestAction(id: string, status: "APPROVED" | "REJECTED") {
  try {
    const actor = await requireRoleAction(["ADMIN", "COORDINATOR"]);
    await reviewStaffingRequest(actor, id, status);
    revalidatePath("/volunteers");
    revalidatePath("/events");
    return { ok: true, message: "Request updated." } satisfies ActionResult;
  } catch (error) {
    logServerError("reviewStaffingRequestAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to review request.") } satisfies ActionResult;
  }
}

export async function respondStaffingAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction(["ATTENDANCE_VOLUNTEER"]);
    await respondToStaffingRequest(actor, {
      requestId: String(formData.get("requestId") ?? ""),
      status: String(formData.get("status") ?? "") as "AVAILABLE" | "PARTIAL" | "NOT_AVAILABLE",
      startTime: String(formData.get("startTime") ?? "") || undefined,
      endTime: String(formData.get("endTime") ?? "") || undefined,
      note: String(formData.get("note") ?? "") || undefined,
    });
    revalidatePath("/volunteer");
    revalidatePath("/volunteer/availability");
    return { ok: true, message: "Availability saved." };
  } catch (error) {
    logServerError("respondStaffingAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to save availability.") };
  }
}

export async function assignToStaffingAction(requestId: string, userId: string) {
  try {
    const actor = await requireStaffSession();
    await assignVolunteerToRequest(actor, requestId, userId);
    revalidatePath("/volunteers");
    revalidatePath("/volunteer");
    return { ok: true, message: "Volunteer assigned." } satisfies ActionResult;
  } catch (error) {
    logServerError("assignToStaffingAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to assign volunteer.") } satisfies ActionResult;
  }
}

export async function saveDepartmentPlanAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireStaffSession();
    const knownAssignments = JSON.parse(String(formData.get("knownAssignments") ?? "[]")) as KnownAssignment[];
    const requirements = (JSON.parse(String(formData.get("requirements") ?? "[]")) as Array<Record<string, string>>).map(
      (row) =>
        ({
          task: row.task,
          neededCount: Number(row.neededCount ?? 0),
          requestDate: parseDateOnly(String(row.requestDate ?? "")),
          startTime: row.startTime,
          endTime: row.endTime,
          notes: row.notes || undefined,
          preAssignedUserId: row.preAssignedUserId || undefined,
        }) satisfies StaffingRequirementInput,
    );
    await saveDepartmentPlan(actor, {
      meetupId: String(formData.get("meetupId") ?? ""),
      departmentId: String(formData.get("departmentId") ?? ""),
      submit: String(formData.get("submit") ?? "") === "1",
      cuisine: String(formData.get("cuisine") ?? "") || undefined,
      sponsorName: String(formData.get("sponsorName") ?? "") || undefined,
      preparationLocation: String(formData.get("preparationLocation") ?? "") || undefined,
      kitchenNotes: String(formData.get("kitchenNotes") ?? "") || undefined,
      knownAssignments,
      requirements,
    });
    revalidatePath("/volunteer");
    revalidatePath("/volunteer/plan");
    revalidatePath("/volunteers");
    revalidatePath("/events");
    return {
      ok: true,
      message: String(formData.get("submit") ?? "") === "1" ? "Plan submitted for approval." : "Draft saved.",
    };
  } catch (error) {
    logServerError("saveDepartmentPlanAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to save department plan.") };
  }
}

export async function reviewDepartmentPlanAction(
  planId: string,
  decision: "APPROVED" | "CHANGES_REQUESTED" | "CLOSED",
) {
  try {
    const actor = await requireRoleAction(["ADMIN", "COORDINATOR"]);
    await reviewDepartmentPlan(actor, planId, decision);
    revalidatePath("/volunteers");
    revalidatePath("/events");
    revalidatePath("/volunteer");
    return { ok: true, message: "Plan updated." } satisfies ActionResult;
  } catch (error) {
    logServerError("reviewDepartmentPlanAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to review plan.") } satisfies ActionResult;
  }
}
