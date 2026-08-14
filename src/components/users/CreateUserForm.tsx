"use client";

import { useActionState } from "react";
import { createUserAction } from "@/actions/users";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";
import type { UserRole } from "@/types/roles";

export function CreateUserForm({ actorRole }: { actorRole: UserRole }) {
  const [state, action, pending] = useActionState(createUserAction, {
    ok: true,
  } as ActionResult);
  const canCreateCoordinator = actorRole === "ADMIN";

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {!state.ok ? <div className="sm:col-span-2"><Alert>{state.error}</Alert></div> : null}
      {state.ok && state.message ? (
        <div className="sm:col-span-2">
          <Alert tone="success">{state.message}</Alert>
        </div>
      ) : null}
      <Field label="Name">
        <Input name="name" required />
      </Field>
      <Field label="Email">
        <Input type="email" name="email" required />
      </Field>
      <Field label="Role">
        <Select name="role" defaultValue="ATTENDANCE_VOLUNTEER">
          {canCreateCoordinator ? <option value="COORDINATOR">Youth Coordinator</option> : null}
          <option value="ATTENDANCE_VOLUNTEER">Attendance Volunteer</option>
        </Select>
      </Field>
      <Field label="Temporary password">
        <Input name="temporaryPassword" type="password" required minLength={10} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked />
        Active
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create account"}
        </Button>
      </div>
    </form>
  );
}
