"use client";

import { useState, useTransition } from "react";
import { cancelRegistrationAction, joinWaitlistAction, registerEventAction } from "@/actions/registrations";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";

export function MemberEventActions({
  eventId,
  status,
  canRegister,
  spotsFull,
  deadlinePassed,
}: {
  eventId: string;
  status?: "REGISTERED" | "WAITLISTED" | "CANCELLED" | null;
  canRegister: boolean;
  spotsFull: boolean;
  deadlinePassed: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setError(null);
    setMessage(null);
    start(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      else setMessage(result.message ?? "Saved.");
    });
  }

  if (status === "REGISTERED") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-teal-800">Registered</p>
        {!deadlinePassed ? (
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => cancelRegistrationAction(eventId))}>
            Cancel registration
          </Button>
        ) : null}
        {message ? <Alert tone="success">{message}</Alert> : null}
        {error ? <Alert>{error}</Alert> : null}
      </div>
    );
  }
  if (status === "WAITLISTED") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-amber-800">Waitlisted</p>
        {!deadlinePassed ? (
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => cancelRegistrationAction(eventId))}>
            Leave waitlist
          </Button>
        ) : null}
        {message ? <Alert tone="success">{message}</Alert> : null}
      </div>
    );
  }
  if (deadlinePassed || !canRegister) {
    return <p className="text-sm text-stone-500">Registration closed</p>;
  }
  if (spotsFull) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-stone-700">Spots Full</p>
        <Button size="sm" disabled={pending} onClick={() => run(() => joinWaitlistAction(eventId))}>
          Join waitlist
        </Button>
        {message ? <Alert tone="success">{message}</Alert> : null}
        {error ? <Alert>{error}</Alert> : null}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Button size="sm" disabled={pending} onClick={() => run(() => registerEventAction(eventId))}>
        Register
      </Button>
      {error === "SPOTS_FULL" ? (
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => joinWaitlistAction(eventId))}>
          Join waitlist
        </Button>
      ) : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      {error && error !== "SPOTS_FULL" ? <Alert>{error}</Alert> : null}
    </div>
  );
}
