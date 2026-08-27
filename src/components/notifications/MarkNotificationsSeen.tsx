"use client";

import { useEffect } from "react";
import { markNotificationsReadAction } from "@/actions/notifications";

export function MarkNotificationsSeen() {
  useEffect(() => {
    void markNotificationsReadAction();
  }, []);
  return null;
}
