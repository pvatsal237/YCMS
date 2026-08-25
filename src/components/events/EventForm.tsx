"use client";

import { useActionState } from "react";
import { createEventAction } from "@/actions/events";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

export function EventForm({
  defaults,
  action,
  submitLabel,
}: {
  defaults?: Record<string, string | number | null | undefined>;
  action?: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(createEventAction, { ok: true } as ActionResult);

  return (
    <form action={action ? action : formAction} className="grid gap-4 sm:grid-cols-2">
      {"ok" in state && !state.ok ? <div className="sm:col-span-2"><Alert>{state.error}</Alert></div> : null}
      <div className="sm:col-span-2">
        <Field label="Event title">
          <Input name="title" defaultValue={defaults?.title ?? ""} required />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Description">
          <Textarea name="description" defaultValue={defaults?.description ?? ""} required />
        </Field>
      </div>
      <Field label="Speaker name (optional)">
        <Input name="speakerName" defaultValue={defaults?.speakerName ?? ""} />
      </Field>
      <Field label="Speaker title (optional)">
        <Input name="speakerTitle" defaultValue={defaults?.speakerTitle ?? ""} />
      </Field>
      <Field label="Speaker organization (optional)">
        <Input name="speakerOrganization" defaultValue={defaults?.speakerOrganization ?? ""} />
      </Field>
      <Field label="Date">
        <Input type="date" name="eventDate" defaultValue={String(defaults?.eventDate ?? "")} required />
      </Field>
      <Field label="Start time">
        <Input type="time" name="startTime" defaultValue={String(defaults?.startTime ?? "09:00")} required />
      </Field>
      <Field label="End time">
        <Input type="time" name="endTime" defaultValue={String(defaults?.endTime ?? "12:00")} required />
      </Field>
      <Field label="Location">
        <Input name="location" defaultValue={defaults?.location ?? ""} required />
      </Field>
      <Field label="Capacity">
        <Input type="number" name="capacity" defaultValue={defaults?.capacity ?? 80} min={1} required />
      </Field>
      <Field label="Registration deadline">
        <Input type="datetime-local" name="registrationDeadline" defaultValue={String(defaults?.registrationDeadline ?? "")} />
      </Field>
      <Field label="Walk-in capacity">
        <Input type="number" name="walkInCapacity" defaultValue={defaults?.walkInCapacity ?? 10} min={0} />
      </Field>
      <Field label="Check-in opens">
        <Input type="time" name="checkInOpensAt" defaultValue={String(defaults?.checkInOpensAt ?? "08:00")} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Internal notes (coordinators only)">
          <Textarea name="internalNotes" defaultValue={defaults?.internalNotes ?? ""} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : submitLabel}</Button>
      </div>
    </form>
  );
}
