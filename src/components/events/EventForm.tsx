"use client";

import { useActionState, useMemo, useState } from "react";
import { saveEventAction } from "@/actions/events";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { EventDatePicker } from "@/components/events/EventDatePicker";
import type { ActionResult } from "@/types";
import type { Event } from "@prisma/client";
import { formatComputedDateTime, parseDateOnly, toDateInputValue } from "@/lib/dates";
import { defaultCheckInOpensAt, defaultDeadline } from "@/lib/event-schedule";
import { sanitizeEventFormData } from "@/lib/sanitize-text";

export function EventForm({ event }: { event?: Event }) {
  const [eventDate, setEventDate] = useState(event ? toDateInputValue(event.eventDate) : "");
  const [startTime, setStartTime] = useState(event?.startTime ?? "10:00");

  const computed = useMemo(() => {
    if (!eventDate || !startTime) {
      return { deadline: "", checkIn: "" };
    }
    const date = parseDateOnly(eventDate);
    return {
      deadline: formatComputedDateTime(defaultDeadline(date, startTime)),
      checkIn: formatComputedDateTime(defaultCheckInOpensAt(date)),
    };
  }, [eventDate, startTime]);

  async function saveAction(prev: ActionResult, formData: FormData) {
    sanitizeEventFormData(formData);
    return saveEventAction(prev, formData);
  }

  const [state, action, pending] = useActionState(saveAction, { ok: true } as ActionResult);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      {!state.ok ? <div className="sm:col-span-2"><Alert>{state.error}</Alert></div> : null}
      {state.ok && state.message ? <div className="sm:col-span-2"><Alert tone="success">{state.message}</Alert></div> : null}
      <div className="sm:col-span-2">
        <Field label="Event title" htmlFor="title">
          <Input id="title" name="title" required defaultValue={event?.title} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Description" htmlFor="description">
          <Textarea id="description" name="description" required defaultValue={event?.description} />
        </Field>
      </div>
      <Field label="Speaker name (optional)" htmlFor="speakerName">
        <Input id="speakerName" name="speakerName" defaultValue={event?.speakerName ?? ""} />
      </Field>
      <Field label="Speaker title (optional)" htmlFor="speakerTitle">
        <Input id="speakerTitle" name="speakerTitle" defaultValue={event?.speakerTitle ?? ""} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Speaker organization (optional)" htmlFor="speakerOrganization">
          <Input id="speakerOrganization" name="speakerOrganization" defaultValue={event?.speakerOrganization ?? ""} />
        </Field>
      </div>
      <EventDatePicker name="eventDate" value={eventDate} onChange={setEventDate} required />
      <Field label="Location" htmlFor="location">
        <Input id="location" name="location" required defaultValue={event?.location} />
      </Field>
      <Field label="Start time" htmlFor="startTime">
        <Input
          id="startTime"
          name="startTime"
          type="time"
          required
          value={startTime}
          onChange={(eventChange) => setStartTime(eventChange.target.value)}
        />
      </Field>
      <Field label="End time" htmlFor="endTime">
        <Input id="endTime" name="endTime" type="time" required defaultValue={event?.endTime ?? "12:00"} />
      </Field>
      <Field label="Total capacity" htmlFor="capacity">
        <Input id="capacity" name="capacity" type="number" min={1} required defaultValue={event?.capacity ?? 50} />
      </Field>
      <Field label="Walk-in reserve (included in total)" htmlFor="walkInCapacity">
        <Input id="walkInCapacity" name="walkInCapacity" type="number" min={0} defaultValue={event?.walkInCapacity ?? 10} />
      </Field>
      <p className="sm:col-span-2 text-xs text-slate-500">
        Walk-in spaces are part of the total. Example: total 50 with a walk-in reserve of 10 leaves 40 advance member spots.
      </p>
      <Field label="Registration deadline (48 hours before start)">
        <Input value={computed.deadline || "Select a date and start time"} readOnly disabled className="bg-slate-100 text-slate-700" />
      </Field>
      <Field label="Check-in opens (8:00 AM on event day)">
        <Input value={computed.checkIn || "Select a date"} readOnly disabled className="bg-slate-100 text-slate-700" />
      </Field>
      <Field label="Status" htmlFor="status">
        <Select id="status" name="status" defaultValue={event?.status ?? "DRAFT"}>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="REGISTRATION_CLOSED">Registration Closed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Internal notes (optional)" htmlFor="internalNotes">
          <Textarea id="internalNotes" name="internalNotes" defaultValue={event?.internalNotes ?? ""} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save event"}</Button>
      </div>
    </form>
  );
}
