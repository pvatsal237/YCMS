"use client";

import { useActionState, useState } from "react";
import { cancelRideRequestAction, requestRideAction } from "@/actions/events";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { formatDate } from "@/lib/dates";
import { rideStatusLabel } from "@/utils/format";
import type { ActionResult } from "@/types";

type ExistingRide = {
  id: string;
  status: string;
  pickupArea: string;
  availableAfter: string;
  passengerCount: number;
};

export function RideRequestMenu({
  events,
  meetupId,
  existingRide,
}: {
  events: Array<{ id: string; title: string; meetupDate: Date; eventType: string; location: string }>;
  meetupId?: string;
  existingRide?: ExistingRide | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await requestRideAction(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    { ok: true } as ActionResult,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await cancelRideRequestAction(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    { ok: true } as ActionResult,
  );
  const selectedId = meetupId ?? events[0]?.id;
  const selected = events.find((event) => event.id === selectedId) ?? events[0];

  if (events.length === 0) return null;

  return (
    <div className="relative shrink-0">
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
        {existingRide ? "Ride requested" : "Request a Ride"}
      </Button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40 md:bg-transparent bg-slate-900/40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-xl border bg-white p-4 shadow-xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:mt-2 md:w-80 md:rounded-lg">
            {existingRide ? (
              <div className="space-y-3 text-sm">
                {!cancelState.ok ? <Alert>{cancelState.error}</Alert> : null}
                <p className="font-medium text-slate-900">You already requested a ride</p>
                <p className="text-slate-600">
                  {selected ? `${selected.title} · ${formatDate(selected.meetupDate)}` : "This event"}
                </p>
                <p>
                  Status: {rideStatusLabel(existingRide.status)}
                  {existingRide.status === "REQUESTED" ? " — still waiting for approval." : "."}
                </p>
                <p>Pickup: {existingRide.pickupArea}</p>
                <p>Available after: {existingRide.availableAfter}</p>
                <p>Passengers: {existingRide.passengerCount}</p>
                {["REQUESTED", "APPROVED", "ASSIGNED"].includes(existingRide.status) ? (
                  <form action={cancelAction}>
                    <input type="hidden" name="rideId" value={existingRide.id} />
                    <Button type="submit" size="sm" variant="secondary" className="w-full" disabled={cancelPending}>
                      {cancelPending ? "Cancelling..." : "Cancel this ride request"}
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : (
              <form action={action} className="space-y-3">
                {!state.ok ? <Alert>{state.error}</Alert> : null}
                {meetupId && selected ? (
                  <>
                    <input type="hidden" name="meetupId" value={selected.id} />
                    <p className="text-sm text-slate-600">
                      {selected.title} · {formatDate(selected.meetupDate)}
                    </p>
                  </>
                ) : (
                  <Field label="Event">
                    <Select name="meetupId" required defaultValue={selectedId}>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title} · {formatDate(event.meetupDate)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <Field label="Pickup area / location">
                  <Input name="pickupArea" required placeholder="North York / Finch" />
                </Field>
                <Field label="Available after">
                  <Input name="availableAfter" required placeholder="After 8:00 PM" />
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
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
