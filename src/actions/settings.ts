"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/session";
import { settingsSchema } from "@/validations/settings";
import { saveSettings } from "@/services/settings";
import { logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";

export async function saveSettingsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction(["ADMIN"]);
    const parsed = settingsSchema.safeParse({
      organizationName: formData.get("organizationName"),
      defaultMeetupLocation: formData.get("defaultMeetupLocation"),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
    }
    await saveSettings(parsed.data, actor);
    revalidatePath("/settings");
    return { ok: true, message: "Settings saved." };
  } catch (error) {
    logServerError("saveSettingsAction", error);
    return {
      ok: false,
      error: toUserMessage(error, "Unable to save settings. Please try again."),
    };
  }
}
