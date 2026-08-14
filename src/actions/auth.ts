"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { loginSchema } from "@/validations/auth";
import { logActivity } from "@/lib/activity-log";
import { getSessionUser } from "@/lib/session";
import type { ActionResult } from "@/types";

export async function loginAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      const code = "code" in error ? String(error.code) : error.type;
      if (code === "disabled" || error.message.includes("disabled")) {
        return { ok: false, error: "This account has been disabled. Contact an administrator." };
      }
      return { ok: false, error: "Invalid email or password." };
    }
    throw error;
  }
}

export async function logoutAction() {
  const user = await getSessionUser();
  if (user) {
    await logActivity({
      userId: user.id,
      action: "LOGOUT",
      entityType: "User",
      entityId: user.id,
      message: `${user.name} signed out`,
    });
  }
  await signOut({ redirectTo: "/login" });
}
