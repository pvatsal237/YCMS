"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRoleAction } from "@/lib/session";
import { meetupSchema, attendanceMarkSchema } from "@/validations/attendance";
import { createMeetup, saveAttendance } from "@/services/attendance";
import { AppError, logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";
import type { AttendanceStatus } from "@prisma/client";

export async function createMeetupAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction(["ADMIN", "COORDINATOR"]);
    const parsed = meetupSchema.safeParse({
      meetupDate: formData.get("meetupDate"),
      title: formData.get("title"),
      location: formData.get("location"),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
    }
    const meetup = await createMeetup(parsed.data, actor);
    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    redirect(`/attendance/${meetup.id}`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    logServerError("createMeetupAction", error);
    return {
      ok: false,
      error: toUserMessage(error, "Unable to save meetup. Please try again."),
    };
  }
}

export async function saveAttendanceAction(
  meetupId: string,
  marks: Array<{ memberId: string; status: AttendanceStatus }>,
): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction([
      "ADMIN",
      "COORDINATOR",
      "ATTENDANCE_VOLUNTEER",
    ]);
    const parsed = attendanceMarkSchema.safeParse({ meetupId, marks });
    if (!parsed.success) {
      return { ok: false, error: "Unable to save attendance. Please try again." };
    }
    await saveAttendance(meetupId, parsed.data.marks, actor);
    revalidatePath("/attendance");
    revalidatePath(`/attendance/${meetupId}`);
    revalidatePath("/follow-ups");
    revalidatePath("/dashboard");
    return { ok: true, message: "Attendance saved." };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, error: error.userMessage };
    }
    logServerError("saveAttendanceAction", error);
    return { ok: false, error: "Unable to load attendance. Please try again." };
  }
}
