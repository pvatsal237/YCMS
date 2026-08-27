"use client";

import { useActionState } from "react";
import { registerEventAction } from "@/actions/registration";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

export function RegisterEventForm({
  eventId,
  label,
  prominent = false,
}: {
  eventId: string;
  label: string;
  prominent?: boolean;
}) {
  const [state, action, pending] = useActionState(registerEventAction, { ok: true } as ActionResult);
  return (
    <form action={action} className="space-y-3">
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="eventId" value={eventId} />
      <Button type="submit" size={prominent ? "md" : "sm"} disabled={pending} className={prominent ? "px-6 py-3 text-base" : undefined}>
        {pending ? "Registering..." : label === "Spots Full" ? "Join Waitlist" : "Register"}
      </Button>
    </form>
  );
}
