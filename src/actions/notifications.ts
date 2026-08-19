"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession } from "@/lib/session";
import { markStaffNotificationsRead } from "@/services/staff-notifications";

export async function markNotificationsReadAction() {
  const user = await requireStaffSession();
  await markStaffNotificationsRead(user.id);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/volunteer");
  revalidatePath("/volunteers");
}
