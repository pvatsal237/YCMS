"use client";

import { useState, useActionState } from "react";
import { cancelGuidanceAction, guidanceMessageAction } from "@/actions/guidance";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Feedback";
import { formatDateTime } from "@/lib/dates";
import { GUIDANCE_LABELS, guidanceStatusLabel, guidanceStatusTone, previewText } from "@/utils/format";
import { canMemberCancelGuidance } from "@/lib/guidance-rules";
import type { ActionResult } from "@/types";
import type { GuidanceCategory, GuidanceStatus } from "@prisma/client";

export function MemberGuidanceCard({
  request,
  memberId,
}: {
  request: {
    id: string;
    memberId: string;
    category: GuidanceCategory;
    message: string;
    status: GuidanceStatus;
    createdAt: Date;
    claimedById: string | null;
    claimedBy: { name: string | null } | null;
    messages: Array<{ id: string; body: string }>;
  };
  memberId: string;
}) {
  const [open, setOpen] = useState(false);
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelGuidanceAction, { ok: true } as ActionResult);
  const canCancel = canMemberCancelGuidance(request, memberId);
  const assigned = request.claimedById ? `Assigned to ${request.claimedBy?.name || "a coordinator"}` : "Unclaimed";

  return (
    <Card>
      <CardBody className="space-y-3">
        {!cancelState.ok ? <Alert>{cancelState.error}</Alert> : null}
        {cancelState.ok && cancelState.message ? <Alert tone="success">{cancelState.message}</Alert> : null}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-medium text-slate-900">{GUIDANCE_LABELS[request.category]}</p>
            <p className="text-sm text-slate-700">{previewText(request.message)}</p>
            <p className="text-sm text-slate-500">{formatDateTime(request.createdAt)}</p>
            <p className="text-sm text-slate-600">{assigned}</p>
          </div>
          <Badge tone={guidanceStatusTone(request.status)}>{guidanceStatusLabel(request.status)}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setOpen((value) => !value)}>
            {open ? "Close" : "Open"}
          </Button>
          {canCancel ? (
            <form
              action={cancelAction}
              onSubmit={(event) => {
                if (!window.confirm("Are you sure you want to cancel this guidance request?")) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={request.id} />
              <Button type="submit" size="sm" variant="danger" disabled={cancelPending}>
                {cancelPending ? "Cancelling..." : "Cancel Request"}
              </Button>
            </form>
          ) : null}
        </div>
        {open ? (
          <div className="space-y-2 border-t border-slate-100 pt-3 text-sm">
            <p className="text-slate-800">{request.message}</p>
            {request.messages.map((message) => (
              <p key={message.id} className="text-slate-600">{message.body}</p>
            ))}
            {request.status !== "RESOLVED" && request.status !== "NEW" ? (
              <form action={guidanceMessageAction} className="flex gap-2">
                <input type="hidden" name="id" value={request.id} />
                <input name="body" required placeholder="Reply" className="flex-1 rounded-md border px-3 py-2" />
                <Button type="submit" size="sm">Send</Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
