"use client";

import { useActionState, useState } from "react";
import { saveTransportAvailabilityAction } from "@/actions/events";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

export function TransportAvailabilityForm({
  meetupId,
  eventTitle,
}: {
  meetupId: string;
  eventTitle: string;
}) {
  const [status, setStatus] = useState("AVAILABLE");
  const [state, action, pending] = useActionState(saveTransportAvailabilityAction, { ok: true } as ActionResult);
  return (
    <form action={action} className="space-y-2 text-sm">
      <input type="hidden" name="meetupId" value={meetupId} />
      <p className="font-medium text-slate-800">Are you available to help with transportation for {eventTitle}?</p>
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <select
        name="status"
        className="rounded-md border border-slate-300 px-2 py-1"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      >
        <option value="AVAILABLE">Available</option>
        <option value="PARTIAL">Partially Available</option>
        <option value="NOT_AVAILABLE">Not Available</option>
      </select>
      {status !== "NOT_AVAILABLE" ? (
        <div className="flex flex-wrap gap-2">
          <input
            name="startTime"
            type="time"
            required={status === "PARTIAL"}
            className="rounded-md border px-2 py-1"
            aria-label="Available From"
            placeholder="From"
          />
          <input
            name="endTime"
            type="time"
            required={status === "PARTIAL"}
            className="rounded-md border px-2 py-1"
            aria-label="Available Until"
            placeholder="Until"
          />
          <input name="passengerCapacity" type="number" min={1} placeholder="Passenger capacity" className="w-40 rounded-md border px-2 py-1" />
        </div>
      ) : null}
      <input name="note" placeholder="Optional note, e.g. Available from 7:00 PM onward" className="w-full rounded-md border px-2 py-1" />
      <Button type="submit" size="sm" disabled={pending}>
        Save
      </Button>
    </form>
  );
}
