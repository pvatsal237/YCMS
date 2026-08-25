"use server";

import { signIn, signOut } from "@/auth";
import { getSessionUser } from "@/lib/session";

export async function googleSignInAction(callbackUrl?: string) {
  await signIn("google", { redirectTo: callbackUrl || "/" });
}

export async function logoutAction() {
  await getSessionUser();
  await signOut({ redirectTo: "/login" });
}
