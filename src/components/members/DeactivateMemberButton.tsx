"use client";

import { useState, useTransition } from "react";
import { deactivateMemberAction } from "@/actions/members";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";

export function DeactivateMemberButton({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2">
      {error ? <Alert>{error}</Alert> : null}
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (!confirm("Deactivate this member? They will no longer appear in attendance lists.")) {
            return;
          }
          start(async () => {
            const result = await deactivateMemberAction(id);
            if (!result.ok) setError(result.error);
          });
        }}
      >
        {pending ? "Deactivating..." : "Deactivate member"}
      </Button>
    </div>
  );
}
