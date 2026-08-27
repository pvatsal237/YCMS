"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { releaseGuidanceAction } from "@/actions/guidance";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

export function ReleaseGuidanceButton({ requestId }: { requestId: string }) {
  const router = useRouter();

  async function submit(prev: ActionResult, formData: FormData) {
    const result = await releaseGuidanceAction(prev, formData);
    if (result.ok) router.refresh();
    return result;
  }

  const [state, action, pending] = useActionState(submit, { ok: true } as ActionResult);
  const released = Boolean(state.ok && state.message);

  return (
    <form
      action={action}
      className="space-y-2"
      onSubmit={(event) => {
        if (released) {
          event.preventDefault();
          return;
        }
        if (
          !window.confirm(
            "Release this guidance request? It will become available for another coordinator to claim.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {released ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="id" value={requestId} />
      {released ? null : (
        <>
          <p className="text-xs text-slate-500">Return this request to the coordinator queue.</p>
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            {pending ? "Releasing..." : "Release Request"}
          </Button>
        </>
      )}
    </form>
  );
}
