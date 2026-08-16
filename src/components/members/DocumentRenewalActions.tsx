"use client";

import { useActionState, useState } from "react";
import { requestDocumentRenewalAction } from "@/actions/member-portal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { documentRequestTypeLabel, roleLabel } from "@/utils/format";
import type { ActionResult } from "@/types";
import type { UserRole } from "@/types/roles";

const STATUS_OPTIONS = [
  "NEED_ASSISTANCE",
  "RENEWAL_REQUESTED",
  "RENEWED",
  "IRCC_QUERY",
] as const;

export type StaffContact = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export function DocumentRenewalActions({
  documentId,
  staffContacts,
  current,
  compact,
}: {
  documentId: string;
  staffContacts: StaffContact[];
  current?: {
    requestType: string;
    assignedToUserId: string | null;
    proposedExpiry: Date | string | null;
  };
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(requestDocumentRenewalAction, {
    ok: true,
  } as ActionResult);
  const [requestType, setRequestType] = useState(
    current?.requestType && STATUS_OPTIONS.includes(current.requestType as (typeof STATUS_OPTIONS)[number])
      ? current.requestType
      : "NEED_ASSISTANCE",
  );

  const proposed =
    current?.proposedExpiry instanceof Date
      ? current.proposedExpiry.toISOString().slice(0, 10)
      : current?.proposedExpiry
        ? String(current.proposedExpiry).slice(0, 10)
        : "";

  const submitLabel =
    requestType === "NEED_ASSISTANCE" || requestType === "IRCC_QUERY"
      ? "Request assistance"
      : "OK";

  return (
    <div className={compact ? "mt-2 space-y-2" : "mt-3 space-y-3"}>
      {current ? (
        <p className={compact ? "text-xs text-slate-600" : "text-sm"}>
          Current response: {documentRequestTypeLabel(current.requestType)}. You can
          change this anytime.
        </p>
      ) : (
        <p className={compact ? "text-xs text-slate-600" : "text-sm"}>
          This notice stays here. Choose an option and who you want to speak with.
        </p>
      )}
      {state.ok && state.message ? <Alert tone="info">{state.message}</Alert> : null}
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:items-end">
        <input type="hidden" name="documentId" value={documentId} />
        <label className="block text-sm">
          Status
          <select
            name="requestType"
            value={requestType}
            onChange={(event) => setRequestType(event.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {documentRequestTypeLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Speak with
          <select
            name="assignedToUserId"
            required
            defaultValue={current?.assignedToUserId ?? ""}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
          >
            <option value="">Select an administrator or coordinator</option>
            {staffContacts.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} ({roleLabel(person.role)})
              </option>
            ))}
          </select>
        </label>
        {requestType === "RENEWED" ? (
          <label className="block text-sm">
            New expiry date
            <input
              type="date"
              name="proposedExpiry"
              required
              defaultValue={proposed}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </label>
        ) : (
          <div />
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {submitLabel}
        </Button>
      </form>
    </div>
  );
}
