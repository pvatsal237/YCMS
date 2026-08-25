"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, LogOut, Menu, Search, UserRound } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { searchMembersAction } from "@/actions/members";
import { roleLabel } from "@/utils/format";
import { APP_NAME } from "@/lib/authorization";
import { maskPhone } from "@/lib/privacy";
import type { SessionUser } from "@/types";

export function Header({
  user,
  notificationCount,
  onMenu,
}: {
  user: SessionUser;
  notificationCount: number;
  onMenu: () => void;
}) {
  const [openProfile, setOpenProfile] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Array<{ id: string; name: string; email: string; phone: string | null }>>([]);
  const canSearch = user.role === "COORDINATOR";
  const notificationsHref = user.role === "MEMBER" ? "/portal/notifications" : "/notifications";

  useEffect(() => {
    if (!canSearch || query.trim().length < 2) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      void searchMembersAction(query).then((results) => {
        if (!cancelled) setHits(results);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, canSearch]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-stone-200 bg-white px-4 lg:px-6">
      <button type="button" className="rounded-md p-2 text-stone-600 lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden text-sm font-semibold text-stone-800 sm:block">{APP_NAME}</div>
      {canSearch ? (
        <div className="relative ml-auto w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value.trim().length < 2) setHits([]);
            }}
            placeholder="Search members"
            className="w-full rounded-md border border-stone-300 bg-stone-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:bg-white"
          />
          {hits.length > 0 ? (
            <div className="absolute mt-1 w-full rounded-md border border-stone-200 bg-white shadow-lg">
              {hits.map((hit) => (
                <Link
                  key={hit.id}
                  href={`/members/${hit.id}`}
                  onClick={() => {
                    setQuery("");
                    setHits([]);
                  }}
                  className="block px-3 py-2 text-sm hover:bg-stone-50"
                >
                  <div className="font-medium text-stone-900">{hit.name}</div>
                  <div className="text-xs text-stone-500">
                    {hit.email} · {maskPhone(hit.phone)}
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="ml-auto" />
      )}
      <Link href={notificationsHref} className="relative rounded-md p-2 text-stone-600 hover:bg-stone-100" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {notificationCount > 0 ? (
          <span className="absolute right-1 top-1 rounded-full bg-teal-700 px-1.5 text-[10px] font-semibold text-white">
            {notificationCount}
          </span>
        ) : null}
      </Link>
      <div className="relative">
        <button type="button" onClick={() => setOpenProfile((value) => !value)} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-stone-100">
          <UserRound className="h-5 w-5 text-stone-500" />
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium text-stone-900">{user.name}</span>
            <span className="block text-xs text-stone-500">{roleLabel(user.role)}</span>
          </span>
        </button>
        {openProfile ? (
          <div className="absolute right-0 mt-2 w-56 rounded-md border border-stone-200 bg-white p-2 shadow-lg">
            <div className="px-2 py-2 text-sm">
              <div className="font-medium text-stone-900">{user.name}</div>
              <div className="text-stone-500">{user.email}</div>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-stone-700 hover:bg-stone-100">
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}
