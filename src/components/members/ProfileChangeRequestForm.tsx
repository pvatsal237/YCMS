"use client";

import { useActionState } from "react";
import { requestProfileChangeAction } from "@/actions/member-portal";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

export function ProfileChangeRequestForm() {
  const [state, action, pending] = useActionState(requestProfileChangeAction, {
    ok: true,
  } as ActionResult);

  return (
    <form action={action} className="space-y-3">
      {state.ok && state.message ? <Alert>{state.message}</Alert> : null}
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      <Field label="Requested change" htmlFor="message">
        <Textarea
          id="message"
          name="message"
          placeholder="Example: Please update my phone number to …"
          required
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Submit request"}
      </Button>
    </form>
  );
}
