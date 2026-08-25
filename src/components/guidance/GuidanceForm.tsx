"use client";

import { useActionState, useState } from "react";
import { createGuidanceAction } from "@/actions/guidance";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

const CATEGORIES = [
  ["IMMIGRATION", "Immigration"],
  ["CAREER_DEVELOPMENT", "Career Development"],
  ["RESUME_INTERVIEW", "Resume / Interview"],
  ["TECHNOLOGY_IT", "Technology / IT"],
  ["AI", "AI"],
  ["FINANCE", "Finance"],
  ["ENGINEERING", "Engineering"],
  ["EDUCATION", "Education"],
  ["ENTREPRENEURSHIP", "Entrepreneurship"],
  ["OTHER", "Other"],
] as const;

export function GuidanceForm() {
  const [category, setCategory] = useState("IMMIGRATION");
  const [state, action, pending] = useActionState(createGuidanceAction, { ok: true } as ActionResult);
  return (
    <form action={action} className="space-y-3">
      {"ok" in state && state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {"ok" in state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <Field label="Category">
        <Select name="category" value={category} onChange={(event) => setCategory(event.target.value)}>
          {CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </Field>
      {category === "OTHER" ? (
        <Field label="What do you need guidance with?">
          <Input name="otherTopic" required />
        </Field>
      ) : null}
      <Field label="Tell us briefly how we can help">
        <Textarea name="message" required />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Sending..." : "Submit request"}</Button>
    </form>
  );
}
