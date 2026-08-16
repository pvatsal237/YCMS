"use client";

import { useActionState, useEffect, useState } from "react";
import { createAssistanceRequestAction } from "@/actions/assistance";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { assistanceCategoryLabel, documentTypeLabel } from "@/utils/format";
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

export function AssistanceRequestMenu({
  coordinators,
  administrators,
  eligibleDocuments,
}: {
  coordinators: StaffOption[];
  administrators: StaffOption[];
  eligibleDocuments: EligibleDocument[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createAssistanceRequestAction, {
    ok: true,
  } as ActionResult);
  const [category, setCategory] = useState("PERSONAL");
  const [requestedRole, setRequestedRole] = useState<"COORDINATOR" | "ADMIN">("COORDINATOR");

  useEffect(() => {
    if (state.ok && state.message) setOpen(false);
  }, [state]);

  const people = requestedRole === "COORDINATOR" ? coordinators : administrators;
  const personLabel = requestedRole === "COORDINATOR" ? "Coordinator" : "Administrator";
  const anyLabel =
    requestedRole === "COORDINATOR" ? "Any Available Coordinator" : "Any Available Administrator";

  return (
    <div className="relative">
      <Button type="button" size="sm" onClick={() => setOpen((value) => !value)}>
        Request Assistance
      </Button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/40 md:bg-transparent"
            aria-label="Close assistance form"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-xl border border-slate-200 bg-white p-4 shadow-xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:mt-2 md:w-[22rem] md:rounded-lg">
            <form action={action} className="space-y-2.5">
              {!state.ok ? <Alert>{state.error}</Alert> : null}
              <Field label="Category">
                <Select
                  name="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {eligibleDocuments.length > 0 ? (
                    <option value="IMMIGRATION_DOCUMENT">
                      {assistanceCategoryLabel("IMMIGRATION_DOCUMENT")}
                    </option>
                  ) : null}
                  <option value="EDUCATION">{assistanceCategoryLabel("EDUCATION")}</option>
                  <option value="EMPLOYMENT">{assistanceCategoryLabel("EMPLOYMENT")}</option>
                  <option value="ACCOMMODATION">{assistanceCategoryLabel("ACCOMMODATION")}</option>
                  <option value="MEETUP">{assistanceCategoryLabel("MEETUP")}</option>
                  <option value="PERSONAL">{assistanceCategoryLabel("PERSONAL")}</option>
                  <option value="OTHER">{assistanceCategoryLabel("OTHER")}</option>
                </Select>
              </Field>
              {category === "IMMIGRATION_DOCUMENT" && eligibleDocuments.length > 0 ? (
                <Field label="Document">
                  <Select name="documentId" required>
                    {eligibleDocuments.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {documentTypeLabel(doc.documentType)} · {doc.expiryDateLabel} · {doc.alertLabel}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              <Field label="Speak to">
                <Select
                  name="requestedRole"
                  value={requestedRole}
                  onChange={(event) =>
                    setRequestedRole(event.target.value as "COORDINATOR" | "ADMIN")
                  }
                >
                  <option value="COORDINATOR">Coordinator</option>
                  <option value="ADMIN">Administrator</option>
                </Select>
              </Field>
              <Field label="Specific person">
                <Select name="requestedUserId" key={requestedRole} defaultValue="ANY">
                  <option value="ANY">{anyLabel}</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
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
              <Field label="Preferred response by">
                <Input type="date" name="preferredResponseBy" />
              </Field>
              <Field label="Note">
                <Textarea name="memberNote" className="min-h-16" />
              </Field>
              <Button type="submit" size="sm" className="w-full" disabled={pending}>
                {pending ? "Sending..." : "Submit Request"}
              </Button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
