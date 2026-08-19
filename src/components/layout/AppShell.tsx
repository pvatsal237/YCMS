"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import type { SessionUser } from "@/types";

export function AppShell({
  user,
  notificationCount,
  displayTitle,
  children,
}: {
  user: SessionUser;
  notificationCount: number;
  displayTitle?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <Sidebar role={user.role} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header
          user={user}
          notificationCount={notificationCount}
          displayTitle={displayTitle}
          onMenu={() => setOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
