"use client";

import { useActionState, useState } from "react";
import { saveTransportAvailabilityAction } from "@/actions/events";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { formatTime12h } from "@/lib/dates";
import type { ActionResult } from "@/types";

const TIME_OPTIONS = Array.from({ length: 18 }, (_, index) => {
  const hour = 15 + Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  const value = `${String(hour).padStart(2, "0")}:${minute}`;
  return { value, label: formatTime12h(value) };
});

function TimeSelect({
  name,
  label,
  required,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string | null;
  hint?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">{required ? "Choose a time" : "Anytime / not sure"}</option>
        {TIME_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TransportAvailabilityForm({
  meetupId,
  eventTitle,
  initial,
}: {
  meetupId: string;
  eventTitle: string;
  initial?: {
    status?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    passengerCapacity?: number | null;
    note?: string | null;
  } | null;
}) {
  const [status, setStatus] = useState(initial?.status ?? "");
  const [state, action, pending] = useActionState(saveTransportAvailabilityAction, { ok: true } as ActionResult);
  const needsTimes = status === "AVAILABLE" || status === "PARTIAL";

  return (
    <form action={action} className="space-y-4 text-sm">
      <input type="hidden" name="meetupId" value={meetupId} />
      <div>
        <p className="font-medium text-slate-900">Can you help with rides for {eventTitle}?</p>
        <p className="mt-1 text-slate-500">
          Choose your availability first. You can come back and change this anytime before the event.
        </p>
      </div>
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Your availability</span>
        <select
          name="status"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Select one</option>
          <option value="AVAILABLE">Available</option>
          <option value="PARTIAL">Partially available</option>
          <option value="NOT_AVAILABLE">Not available</option>
        </select>
      </label>
      {needsTimes ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <TimeSelect
            name="startTime"
            label={status === "PARTIAL" ? "Available from" : "I can start at"}
            required={status === "PARTIAL"}
            defaultValue={initial?.startTime}
            hint={status === "AVAILABLE" ? "Optional. Leave blank if you can help for the whole evening." : undefined}
          />
          {status === "PARTIAL" ? (
            <TimeSelect
              name="endTime"
              label="Available until"
              required
              defaultValue={initial?.endTime}
            />
          ) : null}
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">How many passengers can you take?</span>
            <input
              name="passengerCapacity"
              type="number"
              min={1}
              defaultValue={initial?.passengerCapacity ?? ""}
              placeholder="e.g. 4"
              className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
      ) : null}
      {status ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Note (optional)</span>
          <input
            name="note"
            defaultValue={initial?.note ?? ""}
            placeholder="Anything the lead should know"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      ) : null}
      {status ? (
        <Button type="submit" size="sm" disabled={pending}>
          Save availability
        </Button>
      ) : null}
    </form>
  );
}
