"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  listMyNotificationsAction,
  markNotificationReadAction,
  markNotificationsReadAction,
} from "@/actions/notifications";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/utils/format";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  href: string | null;
  readAt: Date | string | null;
  createdAt: Date | string;
};

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, 30_000);
    return () => clearInterval(timer);
  }, [router]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function refreshList() {
    startTransition(() => {
      void listMyNotificationsAction()
        .then(setRows)
        .catch(() => setRows([]));
    });
  }

  async function openPanel() {
    const next = !open;
    setOpen(next);
    if (next) refreshList();
  }

  async function markOne(row: NotificationRow) {
    if (!row.readAt) {
      await markNotificationReadAction(row.id);
      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, readAt: item.readAt ?? new Date() } : item)),
      );
      router.refresh();
    }
    setOpen(false);
  }

  async function markAll() {
    await markNotificationsReadAction();
    setRows((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date() })));
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => void openPanel()}
        className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 min-w-4 rounded-full bg-red-600 px-1.5 text-center text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 ? (
              <button type="button" className="text-xs font-medium text-teal-800 hover:underline" onClick={() => void markAll()}>
                Mark all as read
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {pending && rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
            ) : (
              rows.map((row) => {
                const unread = !row.readAt;
                const body = (
                  <div className={cn("px-4 py-3 hover:bg-slate-50", unread && "bg-teal-50/60")}>
                    <div className="flex items-start justify-between gap-3">
                      <p className={cn("text-sm text-slate-900", unread && "font-semibold")}>{row.title}</p>
                      <p className="shrink-0 text-[11px] text-slate-500">{formatDateTime(row.createdAt)}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{row.message}</p>
                  </div>
                );
                if (row.href) {
                  return (
                    <Link key={row.id} href={row.href} onClick={() => void markOne(row)}>
                      {body}
                    </Link>
                  );
                }
                return (
                  <button key={row.id} type="button" className="block w-full text-left" onClick={() => void markOne(row)}>
                    {body}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
