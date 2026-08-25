"use client";

import { useTransition } from "react";
import { checkInAction } from "@/actions/checkin";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/dates";

export function CheckInButton({
  eventId,
  memberId,
  already,
  at,
}: {
  eventId: string;
  memberId: string;
  already: boolean;
  at?: Date | null;
}) {
  const [pending, start] = useTransition();
  if (already) {
    return (
      <span className="text-sm text-teal-800">
        ✓ Checked In{at ? ` · ${formatDateTime(at)}` : ""}
      </span>
    );
  }
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => start(async () => { await checkInAction(eventId, memberId); })}
    >
      {pending ? "Checking in..." : "Check In"}
    </Button>
  );
}
