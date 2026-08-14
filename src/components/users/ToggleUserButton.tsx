"use client";

import { useTransition } from "react";
import { setUserActiveAction } from "@/actions/users";
import { Button } from "@/components/ui/Button";

export function ToggleUserButton({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={active ? "danger" : "secondary"}
      disabled={pending}
      onClick={() => {
        const confirmed = confirm(
          active ? "Deactivate this account?" : "Activate this account?",
        );
        if (!confirmed) return;
        start(async () => {
          await setUserActiveAction(id, !active);
        });
      }}
    >
      {pending ? "Updating..." : active ? "Deactivate" : "Activate"}
    </Button>
  );
}
