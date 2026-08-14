"use client";

import { useActionState } from "react";
import { updateFollowUpAction } from "@/actions/follow-ups";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

export function FollowUpForm({
  id,
  status,
  assignedToId,
  notes,
  coordinators,
}: {
  id: string;
  status: string;
  assignedToId?: string | null;
  notes?: string | null;
  coordinators: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(updateFollowUpAction, {
    ok: true,
  } as ActionResult);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="Assigned coordinator">
        <Select name="assignedToId" defaultValue={assignedToId ?? ""}>
          <option value="">Unassigned</option>
          {coordinators.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue={status}>
          <option value="PENDING">Pending</option>
          <option value="CONTACTED">Contacted</option>
          <option value="COMPLETED">Completed</option>
          <option value="UNABLE_TO_REACH">Unable to reach</option>
        </Select>
      </Field>
      <Field label="Notes">
        <Textarea name="notes" defaultValue={notes ?? ""} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Update follow-up"}
      </Button>
    </form>
  );
}
