"use client";

import { useActionState, useState } from "react";
import { requestRideAction } from "@/actions/events";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { formatDate } from "@/lib/dates";
import type { ActionResult } from "@/types";

export function RideRequestMenu({
  events,
}: {
  events: Array<{ id: string; title: string; meetupDate: Date; eventType: string; location: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(requestRideAction, { ok: true } as ActionResult);

  if (events.length === 0) return null;

  return (
    <div className="relative">
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
        Request Ride
      </Button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40 md:bg-transparent bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-xl border bg-white p-4 shadow-xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:mt-2 md:w-80 md:rounded-lg">
            <form action={action} className="space-y-3">
              {!state.ok ? <Alert>{state.error}</Alert> : null}
              {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
              <Field label="Event">
                <Select name="meetupId" required>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} · {formatDate(event.meetupDate)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Pickup area / location">
                <Input name="pickupArea" required placeholder="North York / Finch" />
              </Field>
              <Field label="Available after">
                <Input name="availableAfter" required placeholder="After 7:00 PM" />
              </Field>
              <Field label="Number of passengers">
                <Input name="passengerCount" type="number" min={1} defaultValue={1} required />
              </Field>
              <Field label="Note">
                <Textarea name="note" className="min-h-16" />
              </Field>
              <Button type="submit" size="sm" className="w-full" disabled={pending}>
                {pending ? "Sending..." : "Submit request"}
              </Button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
