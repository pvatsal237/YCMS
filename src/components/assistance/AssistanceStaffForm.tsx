"use client";

import { useActionState } from "react";
import { updateAssistanceRequestAction } from "@/actions/assistance";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { roleLabel } from "@/utils/format";
import type { ActionResult } from "@/types";
import type { UserRole } from "@/types/roles";

export function AssistanceStaffForm({
  id,
  status,
  assignedToId,
  staff,
}: {
  id: string;
  status: string;
  assignedToId?: string | null;
  staff: Array<{ id: string; name: string; role: UserRole }>;
}) {
  const [state, action, pending] = useActionState(updateAssistanceRequestAction, {
    ok: true,
  } as ActionResult);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="Assign to">
        <Select name="assignedToId" defaultValue={assignedToId ?? ""}>
          <option value="">Unassigned</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name} ({roleLabel(person.role)})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue={status}>
          <option value="NEW">New</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="WAITING_FOR_MEMBER">Waiting for member</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </Select>
      </Field>
      <Field label="Internal note">
        <Textarea name="internalNote" placeholder="Visible only to staff." />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Update request"}
      </Button>
    </form>
  );
}
