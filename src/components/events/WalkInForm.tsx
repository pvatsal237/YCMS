"use client";

import { useActionState } from "react";
import { walkInAction } from "@/actions/registration";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

export function WalkInForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(walkInAction, { ok: true } as ActionResult<{ full?: boolean }>);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone={state.data?.full ? "info" : "success"}>{state.message}</Alert> : null}
      <Button type="submit" disabled={pending}>{pending ? "Please wait..." : "Continue"}</Button>
    </form>
  );
}
