"use client";

import { useActionState } from "react";
import { saveEventAction } from "@/actions/events";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";
import type { Event } from "@prisma/client";
import { toDateInputValue } from "@/lib/dates";

export function EventForm({ event }: { event?: Event }) {
  const [state, action, pending] = useActionState(saveEventAction, { ok: true } as ActionResult);
  const deadlineValue = event
    ? new Date(event.registrationDeadline).toISOString().slice(0, 16)
    : "";
  const checkInValue = event ? new Date(event.checkInOpensAt).toISOString().slice(0, 16) : "";

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
      <Field label="Date" htmlFor="eventDate">
        <Input id="eventDate" name="eventDate" type="date" required defaultValue={event ? toDateInputValue(event.eventDate) : ""} />
      </Field>
      <Field label="Location" htmlFor="location">
        <Input id="location" name="location" required defaultValue={event?.location} />
      </Field>
      <Field label="Start time" htmlFor="startTime">
        <Input id="startTime" name="startTime" type="time" required defaultValue={event?.startTime ?? "10:00"} />
      </Field>
      <Field label="End time" htmlFor="endTime">
        <Input id="endTime" name="endTime" type="time" required defaultValue={event?.endTime ?? "12:00"} />
      </Field>
      <Field label="Capacity" htmlFor="capacity">
        <Input id="capacity" name="capacity" type="number" min={1} required defaultValue={event?.capacity ?? 40} />
      </Field>
      <Field label="Walk-in capacity (coordinator only)" htmlFor="walkInCapacity">
        <Input id="walkInCapacity" name="walkInCapacity" type="number" min={0} defaultValue={event?.walkInCapacity ?? 10} />
      </Field>
      <Field label="Registration deadline" htmlFor="registrationDeadline">
        <Input id="registrationDeadline" name="registrationDeadline" type="datetime-local" defaultValue={deadlineValue} />
      </Field>
      <Field label="Check-in opens" htmlFor="checkInOpensAt">
        <Input id="checkInOpensAt" name="checkInOpensAt" type="datetime-local" defaultValue={checkInValue} />
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
