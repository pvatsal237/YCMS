"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { claimGuidanceAction } from "@/actions/guidance";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

export function ClaimGuidanceButton({ requestId }: { requestId: string }) {
  const router = useRouter();

  async function submit(prev: ActionResult, formData: FormData) {
    const result = await claimGuidanceAction(prev, formData);
    if (result.ok) router.refresh();
    return result;
  }

  const [state, action, pending] = useActionState(submit, { ok: true } as ActionResult);
  const claimed = Boolean(state.ok && state.message);

  return (
    <form action={action} className="inline-flex flex-col gap-2">
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {claimed ? <Alert tone="success">{state.ok ? state.message : null}</Alert> : null}
      <input type="hidden" name="id" value={requestId} />
      {claimed ? null : (
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Claiming..." : "Claim Request"}
        </Button>
      )}
    </form>
  );
}
