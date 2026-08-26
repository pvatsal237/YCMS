"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/actions/members";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";
import type { Member } from "@prisma/client";
import { formatPhoneDisplay } from "@/lib/phone";

export function ProfileForm({ member }: { member: Member }) {
  const [state, action, pending] = useActionState(updateProfileAction, { ok: true } as ActionResult);
  return (
    <form action={action} className="grid max-w-lg gap-4">
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="First name" htmlFor="firstName">
        <Input id="firstName" name="firstName" required defaultValue={member.firstName} />
      </Field>
      <Field label="Last name" htmlFor="lastName">
        <Input id="lastName" name="lastName" required defaultValue={member.lastName} />
      </Field>
      <Field label="Email">
        <Input value={member.email} disabled />
      </Field>
      <Field label="Phone number (optional)" htmlFor="phone">
        <Input id="phone" name="phone" defaultValue={member.phone ? formatPhoneDisplay(member.phone) : ""} />
      </Field>
      <Field label="Emergency contact name (optional)" htmlFor="emergencyContactName">
        <Input id="emergencyContactName" name="emergencyContactName" defaultValue={member.emergencyContactName ?? ""} />
      </Field>
      <Field label="Emergency contact phone (optional)" htmlFor="emergencyContactPhone">
        <Input
          id="emergencyContactPhone"
          name="emergencyContactPhone"
          defaultValue={member.emergencyContactPhone ? formatPhoneDisplay(member.emergencyContactPhone) : ""}
        />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save profile"}</Button>
    </form>
  );
}
