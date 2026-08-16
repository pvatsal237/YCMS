"use client";

import { reviewDocumentRequestAction } from "@/actions/member-portal";
import { Button } from "@/components/ui/Button";

export function ReviewRenewalButtons({ requestId }: { requestId: string }) {
  return (
    <div className="flex gap-2">
      <form action={reviewDocumentRequestAction.bind(null, requestId, "APPROVED")}>
        <Button type="submit" size="sm">
          Approve
        </Button>
      </form>
      <form action={reviewDocumentRequestAction.bind(null, requestId, "REJECTED")}>
        <Button type="submit" size="sm" variant="secondary">
          Reject
        </Button>
      </form>
    </div>
  );
}
