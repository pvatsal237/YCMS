"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function WalkInQr({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;
  return (
    <div>
      <Button variant="secondary" onClick={() => setOpen((value) => !value)}>
        {open ? "Hide Walk-In QR Code" : "Show Walk-In QR Code"}
      </Button>
      {open ? (
        <div className="mt-3 rounded-lg border border-stone-200 bg-white p-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Walk-in QR code" className="mx-auto h-48 w-48" />
          <p className="mt-2 break-all text-xs text-stone-500">{url}</p>
        </div>
      ) : null}
    </div>
  );
}
