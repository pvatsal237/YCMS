"use client";

import { useActionState } from "react";
import { createMeetupAction } from "@/actions/attendance";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

export function CreateMeetupForm({ defaultLocation }: { defaultLocation: string }) {
  const [state, action, pending] = useActionState(createMeetupAction, {
    ok: true,
  } as ActionResult);

  return (
    <form action={action} className="max-w-xl space-y-4">
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      <Field label="Date">
        <Input type="date" name="meetupDate" required />
      </Field>
      <Field label="Title">
        <Input name="title" defaultValue="Weekly Youth Meetup" required />
      </Field>
      <Field label="Location">
        <Input name="location" defaultValue={defaultLocation} required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create meetup"}
      </Button>
    </form>
  );
}
