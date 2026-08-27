"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guidanceStatusAction } from "@/actions/guidance";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { nextGuidanceStatusButtons } from "@/lib/guidance-rules";
import { guidanceStatusLabel } from "@/utils/format";
import type { GuidanceStatus } from "@prisma/client";

export function GuidanceStatusButtons({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: GuidanceStatus;
}) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<GuidanceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const targets = nextGuidanceStatusButtons(currentStatus);

  if (targets.length === 0) return null;

  async function apply(status: GuidanceStatus) {
    if (pendingStatus) return;
    setError(null);
    setPendingStatus(status);
    const formData = new FormData();
    formData.set("id", requestId);
    formData.set("status", status);
    const result = await guidanceStatusAction({ ok: true }, formData);
    setPendingStatus(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {targets.map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant="secondary"
            disabled={pendingStatus !== null}
            onClick={() => apply(status)}
          >
            {pendingStatus === status ? "Updating..." : guidanceStatusLabel(status)}
          </Button>
        ))}
      </div>
    </div>
  );
}
