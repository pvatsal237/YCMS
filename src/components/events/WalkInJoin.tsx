"use client";

import { useState, useTransition } from "react";
import { walkInRegisterAction } from "@/actions/registrations";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import Link from "next/link";

export function WalkInJoin({ eventId, token }: { eventId: string; token: string }) {
  const [pending, start] = useTransition();
  const [full, setFull] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (full) {
    return (
      <div className="mt-6 space-y-3">
        <h2 className="text-xl font-semibold">Thanks for joining our community.</h2>
        <p className="text-stone-600">
          Registration for today’s event is full, but your profile has been created and you’ll be able to view future events.
        </p>
        <Link href="/portal" className="text-teal-800">Go to Member Portal</Link>
      </div>
    );
  }
  if (ok) {
    return (
      <div className="mt-6 space-y-2">
        <Alert tone="success">You’re registered as a walk-in. Please see the registration desk to check in.</Alert>
        <Link href="/portal" className="text-sm text-teal-800">Open Member Portal</Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {error ? <Alert>{error}</Alert> : null}
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await walkInRegisterAction(eventId, token);
            if (!result.ok) setError(result.error);
            else if (result.data?.full) setFull(true);
            else setOk(true);
          })
        }
      >
        {pending ? "Registering..." : "Register for today’s event"}
      </Button>
    </div>
  );
}
