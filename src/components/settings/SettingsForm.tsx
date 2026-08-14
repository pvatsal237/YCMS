"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/actions/settings";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

export function SettingsForm({
  organizationName,
  defaultMeetupLocation,
}: {
  organizationName: string;
  defaultMeetupLocation: string;
}) {
  const [state, action, pending] = useActionState(saveSettingsAction, {
    ok: true,
  } as ActionResult);

  return (
    <form action={action} className="max-w-xl space-y-4">
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="Organization name">
        <Input name="organizationName" defaultValue={organizationName} required />
      </Field>
      <Field label="Default meetup location">
        <Input name="defaultMeetupLocation" defaultValue={defaultMeetupLocation} required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
