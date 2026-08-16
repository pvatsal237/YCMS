"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, LogOut, Menu, Search, UserRound } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { globalMemberSearchAction } from "@/actions/members-search";
import { roleLabel } from "@/utils/format";
import type { SessionUser } from "@/types";

type SearchHit = {
  id: string;
  name: string;
  email: string;
  phone: string;
  immigration: string;
};

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
  const [hits, setHits] = useState<SearchHit[]>([]);
  const canSearch = user.role === "ADMIN" || user.role === "COORDINATOR";

  useEffect(() => {
    if (!canSearch || query.trim().length < 2) {
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      void globalMemberSearchAction(query).then((results) => {
        if (!cancelled) setHits(results);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, canSearch]);

  function onQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setHits([]);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
      <button
        type="button"
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden font-semibold text-slate-900 sm:block">
        Youth Community Management System
      </div>
      {canSearch ? (
        <div className="relative ml-auto w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search members by name, phone, email, college..."
            className="w-full rounded-md border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:bg-white"
          />
          {hits.length > 0 ? (
            <div className="absolute mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
              {hits.map((hit) => (
                <Link
                  key={hit.id}
                  href={`/members/${hit.id}`}
                  onClick={() => {
                    setQuery("");
                    setHits([]);
                  }}
                  className="block px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <div className="font-medium text-slate-900">{hit.name}</div>
                  <div className="text-xs text-slate-500">
                    {hit.email} · {hit.phone} · {hit.immigration}
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="ml-auto" />
      )}
      <Link
        href={
          user.role === "ATTENDANCE_VOLUNTEER"
            ? "/attendance"
            : user.role === "ADMIN" || user.role === "COORDINATOR"
              ? "/notifications"
              : "/follow-ups"
        }
        className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {notificationCount > 0 ? (
          <span className="absolute right-1 top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
            {notificationCount}
          </span>
        ) : null}
      </Link>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenProfile((value) => !value)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100"
        >
          <UserRound className="h-5 w-5 text-slate-500" />
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium text-slate-900">{user.name}</span>
            <span className="block text-xs text-slate-500">{roleLabel(user.role)}</span>
          </span>
        </button>
        {openProfile ? (
          <div className="absolute right-0 mt-2 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
            <div className="px-2 py-2 text-sm">
              <div className="font-medium text-slate-900">{user.name}</div>
              <div className="text-slate-500">{user.email}</div>
              <div className="mt-1 text-xs text-slate-500">{roleLabel(user.role)}</div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
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
