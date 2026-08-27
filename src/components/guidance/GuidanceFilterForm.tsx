"use client";

import { useState } from "react";
import { GUIDANCE_LABELS } from "@/utils/format";
import { customDateFieldsVisible, isValidCustomDateRange, type GuidanceRange, type GuidanceReportFilters } from "@/lib/guidance-report";
import type { GuidanceCategory } from "@prisma/client";

const fieldClass =
  "h-10 w-full min-w-[10rem] rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-none";

export function GuidanceFilterForm({
  action,
  filters,
  coordinators,
  events,
  includeSort = false,
}: {
  action: string;
  filters: GuidanceReportFilters;
  coordinators: Array<{ id: string; name: string }>;
  events: Array<{ id: string; title: string }>;
  includeSort?: boolean;
}) {
  const [range, setRange] = useState<GuidanceRange>(filters.range);
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");
  const showDates = customDateFieldsVisible(range);
  const invalidRange = showDates && !isValidCustomDateRange(from, to);

  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(event) => {
        if (invalidRange) {
          event.preventDefault();
          window.alert("From date must be on or before To date.");
        }
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
          <span className="text-xs font-medium leading-4 text-slate-500">Time Range</span>
          <select
            name="range"
            value={range}
            onChange={(event) => setRange(event.target.value as GuidanceRange)}
            className={fieldClass}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="flex min-w-[12rem] flex-[1.4] flex-col gap-1">
          <span className="text-xs font-medium leading-4 text-slate-500">Event</span>
          <select name="event" defaultValue={filters.event} className={fieldClass}>
            <option value="all">All Events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
            <option value="none">No linked event</option>
          </select>
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
          <span className="text-xs font-medium leading-4 text-slate-500">Category</span>
          <select name="category" defaultValue={filters.category ?? ""} className={fieldClass}>
            <option value="">All Categories</option>
            {(Object.keys(GUIDANCE_LABELS) as GuidanceCategory[]).map((key) => (
              <option key={key} value={key}>
                {GUIDANCE_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
          <span className="text-xs font-medium leading-4 text-slate-500">Status</span>
          <select name="status" defaultValue={filters.status ?? ""} className={fieldClass}>
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CLAIMED">Claimed</option>
            <option value="WAITING_FOR_MEMBER">Waiting for Member</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
          <span className="text-xs font-medium leading-4 text-slate-500">Coordinator</span>
          <select name="coordinator" defaultValue={filters.coordinatorId ?? ""} className={fieldClass}>
            <option value="">All Coordinators</option>
            {coordinators.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        {includeSort ? (
          <label className="flex min-w-[9rem] flex-col gap-1">
            <span className="text-xs font-medium leading-4 text-slate-500">Sort</span>
            <select name="sort" defaultValue={filters.sort} className={fieldClass}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="category">Category</option>
              <option value="coordinator">Coordinator</option>
              <option value="completed">Completed date</option>
            </select>
          </label>
        ) : (
          <input type="hidden" name="sort" value={filters.sort} />
        )}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium leading-4 text-transparent">Apply</span>
          <button
            type="submit"
            className="h-10 rounded-md bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800"
          >
            Apply
          </button>
        </div>
      </div>
      {showDates ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[12rem] flex-col gap-1">
            <span className="text-xs font-medium leading-4 text-slate-500">From</span>
            <input
              type="date"
              name="from"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={fieldClass}
              required
            />
          </label>
          <label className="flex min-w-[12rem] flex-col gap-1">
            <span className="text-xs font-medium leading-4 text-slate-500">To</span>
            <input
              type="date"
              name="to"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={fieldClass}
              required
            />
          </label>
          {invalidRange ? <p className="pb-2 text-sm text-red-700">From must be on or before To.</p> : null}
        </div>
      ) : null}
    </form>
  );
}
