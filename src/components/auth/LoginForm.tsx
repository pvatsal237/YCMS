"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

const initial: ActionResult = { ok: true };

export function LoginForm({ errorFromQuery }: { errorFromQuery?: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  const queryMessage =
    errorFromQuery === "disabled"
      ? "This account has been disabled. Contact an administrator."
      : errorFromQuery === "session"
        ? "Session expired. Please sign in again."
        : null;

  return (
    <form action={action} className="space-y-4">
      {queryMessage ? <Alert>{queryMessage}</Alert> : null}
      {!state.ok ? <Alert>{state.error}</Alert> : null}
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
