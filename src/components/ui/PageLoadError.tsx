"use client";

import { Button } from "@/components/ui/Button";

export function PageLoadError({
  title = "Unable to load this page",
  description = "A server error occurred. Please try again.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-white px-5 py-12 text-center">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <Button className="mt-4" size="sm" type="button" onClick={() => window.location.reload()}>
        Try again
      </Button>
    </div>
  );
}
