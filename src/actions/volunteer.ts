"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction, requireStaffSession } from "@/lib/session";
import {
  assignVolunteerDepartments,
  assignVolunteerToRequest,
  createStaffingRequest,
  respondToStaffingRequest,
  reviewStaffingRequest,
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
    await requireRoleAction(["ADMIN", "COORDINATOR"]);
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

export async function respondStaffingAction(formData: FormData) {
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
  } catch (error) {
    logServerError("respondStaffingAction", error);
  }
}

export async function assignToStaffingAction(requestId: string, userId: string) {
  try {
    const actor = await requireStaffSession();
    await assignVolunteerToRequest(actor, requestId, userId);
    revalidatePath("/volunteers");
    return { ok: true, message: "Volunteer assigned." } satisfies ActionResult;
  } catch (error) {
    logServerError("assignToStaffingAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to assign volunteer.") } satisfies ActionResult;
  }
}
