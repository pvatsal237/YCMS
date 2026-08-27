"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import {
  listNotifications,
  markNotificationRead,
  markNotificationsRead,
} from "@/services/notifications";

export async function listMyNotificationsAction() {
  const user = await requireSession();
  return listNotifications(user.id);
}

export async function markNotificationReadAction(id: string) {
  const user = await requireSession();
  await markNotificationRead(user.id, id);
  revalidatePath("/", "layout");
}

export async function markNotificationsReadAction() {
  const user = await requireSession();
  await markNotificationsRead(user.id);
  revalidatePath("/", "layout");
}
