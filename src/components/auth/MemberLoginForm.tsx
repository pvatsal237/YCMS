"use client";

import { useActionState, useState } from "react";
import { requestMemberOtpAction, verifyMemberOtpAction } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import Link from "next/link";
import type { ActionResult } from "@/types";

const initial: ActionResult<{ devOtp?: string }> = { ok: true };

export function MemberLoginForm({ errorFromQuery }: { errorFromQuery?: string }) {
  const [email, setEmail] = useState("");
  const [requested, setRequested] = useState(false);
  const [requestState, requestAction, requestPending] = useActionState(
    async (prev: ActionResult<{ devOtp?: string }>, formData: FormData) => {
      const result = await requestMemberOtpAction(prev, formData);
      if (result.ok) {
        setEmail(String(formData.get("email") ?? ""));
        setRequested(true);
      }
      return result;
    },
    initial,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyMemberOtpAction,
    { ok: true } as ActionResult,
  );

  const queryMessage =
    errorFromQuery === "session"
      ? "Session expired. Please request a new sign-in code."
      : null;

  return (
    <div className="space-y-4">
      {queryMessage ? <Alert>{queryMessage}</Alert> : null}
      {!requested ? (
        <form action={requestAction} className="space-y-4">
          {!requestState.ok ? <Alert>{requestState.error}</Alert> : null}
          <Field label="Registered email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </Field>
          <Button type="submit" disabled={requestPending} className="w-full">
            {requestPending ? "Sending..." : "Send sign-in code"}
          </Button>
        </form>
      ) : (
        <form action={verifyAction} className="space-y-4">
          {requestState.ok && requestState.message ? (
            <p className="text-sm text-slate-600">{requestState.message}</p>
          ) : null}
          {requestState.ok && requestState.data?.devOtp ? (
            <Alert>
              Development code: <strong>{requestState.data.devOtp}</strong>
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
            />
          </Field>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" name="trustDevice" className="mt-1" />
            <span>Trust this browser for 14 days</span>
          </label>
          <Button type="submit" disabled={verifyPending} className="w-full">
            {verifyPending ? "Checking..." : "Sign in"}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-teal-700"
            onClick={() => setRequested(false)}
          >
            Use a different email
          </button>
        </form>
      )}
      <p className="text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-teal-700">
          Back to sign-in options
        </Link>
      </p>
    </div>
  );
}
