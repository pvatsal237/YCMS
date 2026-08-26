"use server";

import { requireSession } from "@/lib/session";
import { markNotificationsRead } from "@/services/notifications";

export async function markNotificationsReadAction() {
  const user = await requireSession();
  await markNotificationsRead(user.id);
}
