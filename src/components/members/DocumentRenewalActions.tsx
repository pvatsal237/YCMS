"use client";

import { useActionState } from "react";
import { requestDocumentRenewalAction } from "@/actions/member-portal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

export function DocumentRenewalActions({ documentId }: { documentId: string }) {
  const [state, action, pending] = useActionState(requestDocumentRenewalAction, {
    ok: true,
  } as ActionResult);

  return (
    <div className="mt-3 space-y-3">
      {state.ok && state.message ? <Alert tone="info">{state.message}</Alert> : null}
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <form action={action}>
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="requestType" value="RENEWAL_REQUESTED" />
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            I have requested renewal
          </Button>
        </form>
        <form action={action} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="requestType" value="RENEWED" />
          <label className="text-sm text-slate-700">
            New expiry
            <input
              type="date"
              name="proposedExpiry"
              required
              className="mt-1 block rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            Already renewed
          </Button>
        </form>
      </div>
      <p className="text-xs text-slate-500">
        Coordinators must approve before your stored expiry date changes.
      </p>
    </div>
  );
}
