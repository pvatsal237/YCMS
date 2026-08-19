"use client";

import { useActionState, useState } from "react";
import {
  identifyLoginAction,
  loginAction,
  verifyMemberOtpAction,
} from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import type { ActionResult } from "@/types";

export function UnifiedLoginForm({ errorFromQuery }: { errorFromQuery?: string }) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "staff" | "member">("email");
  const [identifyState, identifyAction, identifyPending] = useActionState(
    async (
      prev: ActionResult<{ kind?: "staff" | "member"; devOtp?: string }>,
      formData: FormData,
    ) => {
      const result = await identifyLoginAction(prev, formData);
      if (result.ok && result.data?.kind) {
        setEmail(String(formData.get("email") ?? ""));
        setStep(result.data.kind);
      }
      return result;
    },
    { ok: true } as ActionResult<{ kind?: "staff" | "member"; devOtp?: string }>,
  );
  const [staffState, staffAction, staffPending] = useActionState(loginAction, {
    ok: true,
  } as ActionResult);
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyMemberOtpAction,
    { ok: true } as ActionResult,
  );

  const queryMessage =
    errorFromQuery === "disabled"
      ? "This account has been disabled. Contact an administrator."
      : errorFromQuery === "session"
        ? "Session expired. Please sign in again."
        : null;

  return (
    <div className="space-y-5">
      {queryMessage ? <Alert>{queryMessage}</Alert> : null}

      {step === "email" ? (
        <form action={identifyAction} className="space-y-4">
          {!identifyState.ok ? <Alert>{identifyState.error}</Alert> : null}
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </Field>
          <Button type="submit" disabled={identifyPending} className="w-full">
            {identifyPending ? "Continuing..." : "Continue"}
          </Button>
        </form>
      ) : null}

      {step === "staff" ? (
        <form action={staffAction} className="space-y-4">
          {!staffState.ok ? <Alert>{staffState.error}</Alert> : null}
          <input type="hidden" name="email" value={email} />
          <p className="text-sm text-slate-600">{email}</p>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Button type="submit" disabled={staffPending} className="w-full">
            {staffPending ? "Signing in..." : "Sign in"}
          </Button>
          <button type="button" className="w-full text-sm text-slate-600" onClick={() => setStep("email")}>
            Use a different email
          </button>
        </form>
      ) : null}

      {step === "member" ? (
        <form action={verifyAction} className="space-y-4">
          {identifyState.ok && identifyState.message ? (
            <p className="text-sm leading-6 text-slate-600">{identifyState.message}</p>
          ) : null}
          {identifyState.ok && identifyState.data?.devOtp ? (
            <Alert tone="info">
              Development code: <strong>{identifyState.data.devOtp}</strong>
            </Alert>
          ) : null}
          {!verifyState.ok ? <Alert>{verifyState.error}</Alert> : null}
          <input type="hidden" name="email" value={email} />
          <Field label="One-time code" htmlFor="otp">
            <Input
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              defaultValue={identifyState.ok ? identifyState.data?.devOtp ?? "" : ""}
            />
          </Field>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" name="trustDevice" className="mt-1" />
            <span>Trust this browser for 14 days</span>
          </label>
          <Button type="submit" disabled={verifyPending} className="w-full">
            {verifyPending ? "Checking..." : "Sign in"}
          </Button>
          <button type="button" className="w-full text-sm text-slate-600" onClick={() => setStep("email")}>
            Use a different email
          </button>
        </form>
      ) : null}
    </div>
  );
}
