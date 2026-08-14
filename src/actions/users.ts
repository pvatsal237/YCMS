"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/session";
import { createUserSchema, updateUserStatusSchema } from "@/validations/user";
import { createUser, setUserActive } from "@/services/users";
import { logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";

export async function createUserAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction(["ADMIN", "COORDINATOR"]);
    const parsed = createUserSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      role: formData.get("role"),
      temporaryPassword: formData.get("temporaryPassword"),
      active: formData.get("active") === "on" || formData.get("active") === "true",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
    }
    await createUser(parsed.data, actor);
    revalidatePath("/admin/users");
    return { ok: true, message: "User account created." };
  } catch (error) {
    logServerError("createUserAction", error);
    return {
      ok: false,
      error: toUserMessage(error, "Unable to create user. Please try again."),
    };
  }
}

export async function setUserActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction(["ADMIN", "COORDINATOR"]);
    const parsed = updateUserStatusSchema.safeParse({ id, active });
    if (!parsed.success) {
      return { ok: false, error: "User not found." };
    }
    await setUserActive(parsed.data.id, parsed.data.active, actor);
    revalidatePath("/admin/users");
    return { ok: true, message: active ? "User activated." : "User deactivated." };
  } catch (error) {
    logServerError("setUserActiveAction", error);
    return {
      ok: false,
      error: toUserMessage(error, "Unable to update user. Please try again."),
    };
  }
}
