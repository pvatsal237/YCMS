"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

function safeCallbackUrl(callbackUrl?: string) {
  return callbackUrl?.startsWith("/") ? callbackUrl : "/";
}

export function GoogleSignInButton({ callbackUrl, label = "Continue with Google" }: { callbackUrl?: string; label?: string }) {
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((response) => response.json())
      .then((data: { csrfToken?: string }) => setCsrfToken(data.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));
  }, []);

  return (
    <form action="/api/auth/signin/google" method="post">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="callbackUrl" value={safeCallbackUrl(callbackUrl)} />
      <Button type="submit" className="w-full" disabled={!csrfToken}>
        {label}
      </Button>
    </form>
  );
}
