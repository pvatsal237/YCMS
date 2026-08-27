"use client";

import { useState, useActionState } from "react";
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
  const [formKey, setFormKey] = useState(0);

  async function submit(prev: ActionResult, formData: FormData) {
    const result = await createGuidanceAction(prev, formData);
    if (result.ok) {
      setOpen(false);
      setCategory("");
      setFormKey((key) => key + 1);
    }
    return result;
  }

  const [state, action, pending] = useActionState(submit, { ok: true } as ActionResult);

  return (
    <div className="space-y-3">
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {!open ? (
        <Button type="button" onClick={() => setOpen(true)}>
          Request Guidance
        </Button>
      ) : (
        <form key={formKey} action={action} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <Field label="Category" htmlFor="category">
            <Select
              id="category"
              name="category"
              required
              value={category}
              onChange={(event) => setCategory(event.target.value as GuidanceCategory)}
              disabled={pending}
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
              <Input id="customTopic" name="customTopic" required disabled={pending} />
            </Field>
          ) : null}
          <Field label="Tell us briefly how we can help" htmlFor="message">
            <Textarea id="message" name="message" required disabled={pending} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Sending..." : "Send Request"}
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
