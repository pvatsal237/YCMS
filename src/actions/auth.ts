"use server";

import { signOut } from "@/auth";
import { getSessionUser } from "@/lib/session";

export async function logoutAction() {
  await getSessionUser();
  await signOut({ redirectTo: "/login" });
}
