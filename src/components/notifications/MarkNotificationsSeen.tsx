"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsReadAction } from "@/actions/notifications";

export function MarkNotificationsSeen() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void markNotificationsReadAction().then(() => router.refresh());
  }, [router]);

  return null;
}
