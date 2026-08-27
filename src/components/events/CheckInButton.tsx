"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkInAction } from "@/actions/registration";
import { Button } from "@/components/ui/Button";
import { formatCheckInOpensMessage, formatDateTime, isCheckInOpen } from "@/lib/dates";

export function CheckInButton({
  registrationId,
  checkInOpensAt,
  checkedIn,
  checkedInAt,
}: {
  registrationId: string;
  checkInOpensAt: string;
  checkedIn?: boolean;
  checkedInAt?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(() => isCheckInOpen(checkInOpensAt));
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function tick() {
      setOpen(isCheckInOpen(checkInOpensAt));
    }
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [checkInOpensAt]);

  if (checkedIn) {
    return (
      <div className="text-right">
        <p className="text-sm font-medium text-emerald-800">Checked In</p>
        {checkedInAt ? <p className="text-xs text-slate-500">{formatDateTime(checkedInAt)}</p> : null}
      </div>
    );
  }

  if (!open) {
    return (
      <div className="max-w-xs text-right">
        <Button type="button" size="sm" disabled>
          Check In
        </Button>
        <p className="mt-1 text-xs text-slate-500">{formatCheckInOpensMessage(checkInOpensAt)}</p>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        setPending(true);
        try {
          await checkInAction(formData);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="registrationId" value={registrationId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Checking in..." : "Check In"}
      </Button>
    </form>
  );
}
