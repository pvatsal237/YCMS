"use client";

import { useActionState, useState } from "react";
import { respondStaffingAction } from "@/actions/volunteer";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

export function StaffingResponseForm({ requestId }: { requestId: string }) {
  const [status, setStatus] = useState("AVAILABLE");
  const [state, action, pending] = useActionState(respondStaffingAction, { ok: true } as ActionResult);
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="requestId" value={requestId} />
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <select
          name="status"
          className="rounded-md border border-slate-300 px-2 py-1"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="AVAILABLE">Available</option>
          <option value="PARTIAL">Partially available</option>
          <option value="NOT_AVAILABLE">Not available</option>
        </select>
        {status === "PARTIAL" ? (
          <>
            <input name="startTime" placeholder="From" required className="w-24 rounded-md border px-2 py-1" />
            <input name="endTime" placeholder="To" required className="w-24 rounded-md border px-2 py-1" />
            <input name="note" placeholder="Note" className="w-40 rounded-md border px-2 py-1" />
          </>
        ) : null}
        <Button type="submit" size="sm" disabled={pending}>
          Save
        </Button>
      </div>
    </form>
  );
}
