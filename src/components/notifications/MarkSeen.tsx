"use client";

import { useEffect } from "react";
import { markNotificationsReadAction } from "@/actions/members";

export function MarkSeen() {
  useEffect(() => {
    void markNotificationsReadAction();
  }, []);
  return null;
}
