"use client";

import { googleSignInAction } from "@/actions/auth";
import { Button } from "@/components/ui/Button";

export function GoogleSignInButton({ callbackUrl, label = "Continue with Google" }: { callbackUrl?: string; label?: string }) {
  return (
    <form action={async () => googleSignInAction(callbackUrl)}>
      <Button type="submit" className="w-full">
        {label}
      </Button>
    </form>
  );
}
