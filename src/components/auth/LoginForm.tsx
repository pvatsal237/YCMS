"use client";

import { useActionState, useState } from "react";
import { demoBypassSignInAction, requestOtpAction, verifyOtpAction } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { isDemoBypassEmail } from "@/lib/demo-bypass-accounts";
import type { ActionResult } from "@/types";

export function LoginForm({
  errorFromQuery,
  nextPath,
}: {
  errorFromQuery?: string;
  nextPath?: string;
}) {
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [useDemoPassword, setUseDemoPassword] = useState(false);
  const [requestState, requestAction, requestPending] = useActionState(
    async (prev: ActionResult<{ devOtp?: string; detectedRoleLabel?: string }>, formData: FormData) => {
      const result = await requestOtpAction(prev, formData);
      if (result.ok) {
        setEmail(String(formData.get("email") ?? "").trim().toLowerCase());
        setStep("otp");
        setUseDemoPassword(false);
      }
      return result;
    },
    { ok: true } as ActionResult<{ devOtp?: string; detectedRoleLabel?: string }>,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyOtpAction, {
    ok: true,
  } as ActionResult);
  const [demoState, demoAction, demoPending] = useActionState(demoBypassSignInAction, {
    ok: true,
  } as ActionResult);

  const activeEmail = step === "email" ? emailInput : email;
  const showDemoOption = isDemoBypassEmail(activeEmail);

  const queryMessage =
    errorFromQuery === "disabled"
      ? "This account has been disabled."
      : errorFromQuery === "session"
        ? "Session expired. Please sign in again."
        : null;

  return (
    <div className="space-y-5">
      {queryMessage ? <Alert>{queryMessage}</Alert> : null}
      {step === "email" ? (
        <form action={requestAction} className="space-y-4">
          {!requestState.ok ? <Alert>{requestState.error}</Alert> : null}
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={emailInput}
              onChange={(event) => {
                setEmailInput(event.target.value);
                setUseDemoPassword(false);
              }}
            />
          </Field>
          <Button type="submit" disabled={requestPending} className="w-full">
            {requestPending ? "Sending code..." : "Send sign-in code"}
          </Button>
        </form>
      ) : (
        <form action={verifyAction} className="space-y-4">
          {requestState.ok && requestState.data?.detectedRoleLabel ? (
            <p className="text-sm text-slate-600">{requestState.data.detectedRoleLabel}</p>
          ) : null}
          {requestState.ok && requestState.message ? (
            <p className="text-sm text-slate-600">{requestState.message}</p>
          ) : null}
          {requestState.ok && requestState.data?.devOtp ? (
            <Alert tone="info">
              Local development code: <strong>{requestState.data.devOtp}</strong>
            </Alert>
          ) : null}
          {!verifyState.ok ? <Alert>{verifyState.error}</Alert> : null}
          <input type="hidden" name="email" value={email} />
          {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
          <p className="text-sm text-slate-600">{email}</p>
          <Field label="6-digit code" htmlFor="otp">
            <Input
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              defaultValue={requestState.ok ? requestState.data?.devOtp ?? "" : ""}
            />
          </Field>
          <Button type="submit" disabled={verifyPending} className="w-full">
            {verifyPending ? "Checking..." : "Sign in"}
          </Button>
          <button type="button" className="w-full text-sm text-slate-600" onClick={() => setStep("email")}>
            Use a different email
          </button>
        </form>
      )}
      {showDemoOption ? (
        <div className="space-y-3 border-t border-slate-200 pt-4">
          {useDemoPassword ? (
            <form action={demoAction} className="space-y-3">
              {!demoState.ok ? <Alert>{demoState.error}</Alert> : null}
              <input type="hidden" name="email" value={activeEmail} />
              {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
              <Field label="Demo Password" htmlFor="demo-password">
                <Input id="demo-password" name="password" type="password" autoComplete="current-password" required />
              </Field>
              <Button type="submit" disabled={demoPending} className="w-full">
                {demoPending ? "Signing in..." : "Sign in"}
              </Button>
              <button type="button" className="w-full text-sm text-slate-600" onClick={() => setUseDemoPassword(false)}>
                Use a 6-digit code instead
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="w-full text-sm text-slate-600"
              onClick={() => setUseDemoPassword(true)}
            >
              Use demo password
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
