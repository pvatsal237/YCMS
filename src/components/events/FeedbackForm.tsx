"use client";

import { submitFeedbackAction } from "@/actions/members";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

export function FeedbackForm({ eventId }: { eventId: string }) {
  return (
    <form action={async (formData) => { await submitFeedbackAction(eventId, formData); }} className="mt-2 space-y-2">
      <label className="text-xs text-stone-500">Optional feedback</label>
      <select name="rating" className="rounded-md border border-stone-300 px-2 py-1 text-sm" defaultValue="5">
        <option value="5">5 — Excellent</option>
        <option value="4">4</option>
        <option value="3">3</option>
        <option value="2">2</option>
        <option value="1">1</option>
      </select>
      <Textarea name="comment" placeholder="Short comment (optional)" />
      <Button type="submit" size="sm" variant="secondary">Submit feedback</Button>
    </form>
  );
}
