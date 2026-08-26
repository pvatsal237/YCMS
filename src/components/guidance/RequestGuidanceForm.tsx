"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createGuidanceAction } from "@/actions/guidance";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { GUIDANCE_LABELS } from "@/utils/format";
import type { ActionResult } from "@/types";
import type { GuidanceCategory } from "@prisma/client";

export function RequestGuidanceForm() {
  const [category, setCategory] = useState<GuidanceCategory | "">("");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createGuidanceAction, { ok: true } as ActionResult);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Request Guidance
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="Category" htmlFor="category">
        <Select
          id="category"
          name="category"
          required
          value={category}
          onChange={(event) => setCategory(event.target.value as GuidanceCategory)}
        >
          <option value="">Choose one</option>
          {(Object.keys(GUIDANCE_LABELS) as GuidanceCategory[]).map((key) => (
            <option key={key} value={key}>
              {GUIDANCE_LABELS[key]}
            </option>
          ))}
        </Select>
      </Field>
      {category === "OTHER" ? (
        <Field label="Custom topic" htmlFor="customTopic">
          <Input id="customTopic" name="customTopic" required />
        </Field>
      ) : null}
      <Field label="Tell us briefly how we can help" htmlFor="message">
        <Textarea id="message" name="message" required />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Sending..." : "Send request"}</Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
