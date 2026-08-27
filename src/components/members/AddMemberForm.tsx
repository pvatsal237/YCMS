"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createMemberAction } from "@/actions/members";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import type { ActionResult } from "@/types";

export function AddMemberForm() {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(createMemberAction, { ok: true } as ActionResult);
  const shownSuccess = useRef<string | null>(null);

  useEffect(() => {
    if (state.ok && state.message && shownSuccess.current !== state.message) {
      shownSuccess.current = state.message;
      setFormKey((key) => key + 1);
    }
  }, [state]);

  return (
    <div className="space-y-4">
      <Button type="button" onClick={() => setOpen((value) => !value)}>
        {open ? "Cancel" : "Add Member"}
      </Button>
      {open ? (
        <Card>
          <CardBody>
            <form key={formKey} action={action} className="grid gap-4 sm:grid-cols-2">
              {!state.ok ? <div className="sm:col-span-2"><Alert>{state.error}</Alert></div> : null}
              {state.ok && state.message ? (
                <div className="sm:col-span-2"><Alert tone="success">{state.message}</Alert></div>
              ) : null}
              <Field label="First Name" htmlFor="firstName">
                <Input id="firstName" name="firstName" required autoComplete="given-name" />
              </Field>
              <Field label="Last Name" htmlFor="lastName">
                <Input id="lastName" name="lastName" required autoComplete="family-name" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Email" htmlFor="memberEmail">
                  <Input id="memberEmail" name="email" type="email" required autoComplete="email" />
                </Field>
              </div>
              <Field label="Phone (optional)" htmlFor="phone">
                <Input id="phone" name="phone" autoComplete="tel" />
              </Field>
              <Field label="Emergency Contact Name (optional)" htmlFor="emergencyContactName">
                <Input id="emergencyContactName" name="emergencyContactName" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Emergency Contact Phone (optional)" htmlFor="emergencyContactPhone">
                  <Input id="emergencyContactPhone" name="emergencyContactPhone" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Adding..." : "Save member"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}