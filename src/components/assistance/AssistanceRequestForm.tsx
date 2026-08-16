"use client";

import { useActionState, useMemo, useState } from "react";
import { createAssistanceRequestAction } from "@/actions/assistance";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { assistanceCategoryLabel, documentTypeLabel, roleLabel } from "@/utils/format";
import type { ActionResult } from "@/types";
import type { UserRole } from "@/types/roles";

type StaffOption = { id: string; name: string; role: UserRole };
type EligibleDocument = {
  id: string;
  documentType: string;
  expiryDateLabel: string;
  daysRemaining: number;
  alertLabel: string;
};

export function AssistanceRequestForm({
  coordinators,
  administrators,
  eligibleDocuments,
}: {
  coordinators: StaffOption[];
  administrators: StaffOption[];
  eligibleDocuments: EligibleDocument[];
}) {
  const [state, action, pending] = useActionState(createAssistanceRequestAction, {
    ok: true,
  } as ActionResult);
  const [category, setCategory] = useState("PERSONAL");
  const [requestedRole, setRequestedRole] = useState<"COORDINATOR" | "ADMIN">("COORDINATOR");

  const people = requestedRole === "COORDINATOR" ? coordinators : administrators;
  const personLabel = requestedRole === "COORDINATOR" ? "Coordinator" : "Administrator";
  const immigrationLocked = category === "IMMIGRATION_DOCUMENT" && eligibleDocuments.length === 0;

  const documentHint = useMemo(() => {
    if (category !== "IMMIGRATION_DOCUMENT") return null;
    if (eligibleDocuments.length === 0) {
      return "Immigration document requests are only available when a permit, PR card, or passport expires within 12 months or has already expired.";
    }
    return null;
  }, [category, eligibleDocuments.length]);

  return (
    <form action={action} className="space-y-4">
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <Select name="category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="IMMIGRATION_DOCUMENT">{assistanceCategoryLabel("IMMIGRATION_DOCUMENT")}</option>
            <option value="EDUCATION">{assistanceCategoryLabel("EDUCATION")}</option>
            <option value="EMPLOYMENT">{assistanceCategoryLabel("EMPLOYMENT")}</option>
            <option value="ACCOMMODATION">{assistanceCategoryLabel("ACCOMMODATION")}</option>
            <option value="MEETUP">{assistanceCategoryLabel("MEETUP")}</option>
            <option value="PERSONAL">{assistanceCategoryLabel("PERSONAL")}</option>
            <option value="OTHER">{assistanceCategoryLabel("OTHER")}</option>
          </Select>
        </Field>
        <Field label="Speak to">
          <Select
            name="requestedRole"
            value={requestedRole}
            onChange={(event) => setRequestedRole(event.target.value as "COORDINATOR" | "ADMIN")}
          >
            <option value="COORDINATOR">Coordinator</option>
            <option value="ADMIN">Administrator</option>
          </Select>
        </Field>
      </div>

      {category === "IMMIGRATION_DOCUMENT" ? (
        <Field label="Immigration document">
          <Select name="documentId" required={eligibleDocuments.length > 0} disabled={immigrationLocked}>
            {eligibleDocuments.length === 0 ? (
              <option value="">No eligible documents</option>
            ) : (
              eligibleDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {documentTypeLabel(doc.documentType)} · expires {doc.expiryDateLabel} · {doc.daysRemaining < 0 ? `${Math.abs(doc.daysRemaining)} days overdue` : `${doc.daysRemaining} days remaining`} · {doc.alertLabel}
                </option>
              ))
            )}
          </Select>
          {documentHint ? <p className="mt-1 text-xs text-slate-500">{documentHint}</p> : null}
        </Field>
      ) : null}

      <Field label={`Select ${personLabel}`}>
        <Select name="requestedUserId" key={requestedRole} defaultValue="ANY">
          <option value="ANY">Any available {personLabel.toLowerCase()}</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name} ({roleLabel(person.role)})
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Urgency">
          <Select name="urgency" defaultValue="MEDIUM">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>
        </Field>
        <Field label="Impact">
          <Select name="impact" defaultValue="MEDIUM">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>
        </Field>
      </div>

      <Field label="Preferred response by (optional)">
        <Input type="date" name="preferredResponseBy" />
      </Field>
      <Field label="Note (optional)">
        <Textarea
          name="memberNote"
          placeholder="I would like to speak before this Saturday regarding my work situation."
        />
      </Field>
      <Button type="submit" disabled={pending || immigrationLocked}>
        {pending ? "Sending..." : "Request assistance"}
      </Button>
    </form>
  );
}
