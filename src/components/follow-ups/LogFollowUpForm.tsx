"use client";

import { useActionState, useState } from "react";
import { logFollowUpAction } from "@/actions/follow-ups";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { FOLLOW_UP_OUTCOMES } from "@/utils/follow-up-outcomes";
import type { ActionResult } from "@/types";

export function LogFollowUpForm({
  id,
  memberName,
  compact = false,
}: {
  id: string;
  memberName: string;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(logFollowUpAction, {
    ok: true,
  } as ActionResult);
  const [outcome, setOutcome] = useState("");
  const selected = FOLLOW_UP_OUTCOMES.find((item) => item.value === outcome);

  return (
    <form action={action} className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm font-medium text-slate-800">
        Log contact with {memberName}
      </p>
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="What happened?">
        <Select
          name="outcome"
          required
          value={outcome}
          onChange={(event) => setOutcome(event.target.value)}
        >
          <option value="">Select an option</option>
          {FOLLOW_UP_OUTCOMES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Note (optional)">
        <Textarea
          name="notes"
          placeholder="Example: Busy with exams until next week, or did not pick up, or asked me to call back this evening."
          className={compact ? "min-h-20" : undefined}
        />
      </Field>
      <Field label={selected?.suggestCallback ? "Call back on" : "Call back on (optional)"}>
        <Input type="date" name="nextFollowUpAt" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save follow-up"}
      </Button>
    </form>
  );
}
