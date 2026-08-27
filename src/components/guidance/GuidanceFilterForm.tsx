import { GUIDANCE_LABELS } from "@/utils/format";
import type { GuidanceReportFilters } from "@/lib/guidance-report";
import type { GuidanceCategory } from "@prisma/client";

export function GuidanceFilterForm({
  action,
  filters,
  coordinators,
  events,
  includeSort = false,
  extra,
}: {
  action: string;
  filters: GuidanceReportFilters;
  coordinators: Array<{ id: string; name: string }>;
  events: Array<{ id: string; title: string }>;
  includeSort?: boolean;
  extra?: React.ReactNode;
}) {
  const selectClass = "rounded-md border border-slate-300 px-3 py-2 text-sm";
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="text-xs text-slate-500">
        Time range
        <select name="range" defaultValue={filters.range} className={`${selectClass} mt-1 block`}>
          <option value="today">Today</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="custom">Custom Date Range</option>
        </select>
      </label>
      <label className="text-xs text-slate-500">
        From
        <input type="date" name="from" defaultValue={filters.from ?? ""} className={`${selectClass} mt-1 block`} />
      </label>
      <label className="text-xs text-slate-500">
        To
        <input type="date" name="to" defaultValue={filters.to ?? ""} className={`${selectClass} mt-1 block`} />
      </label>
      <label className="text-xs text-slate-500">
        Event
        <select name="event" defaultValue={filters.event} className={`${selectClass} mt-1 block max-w-56`}>
          <option value="all">All Events</option>
          <option value="none">No linked event</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-500">
        Category
        <select name="category" defaultValue={filters.category ?? ""} className={`${selectClass} mt-1 block`}>
          <option value="">All Categories</option>
          {(Object.keys(GUIDANCE_LABELS) as GuidanceCategory[]).map((key) => (
            <option key={key} value={key}>
              {GUIDANCE_LABELS[key]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-500">
        Status
        <select name="status" defaultValue={filters.status ?? ""} className={`${selectClass} mt-1 block`}>
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="CLAIMED">Claimed</option>
          <option value="WAITING_FOR_MEMBER">Waiting for Member</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </label>
      <label className="text-xs text-slate-500">
        Coordinator
        <select name="coordinator" defaultValue={filters.coordinatorId ?? ""} className={`${selectClass} mt-1 block`}>
          <option value="">All Coordinators</option>
          {coordinators.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      {includeSort ? (
        <label className="text-xs text-slate-500">
          Sort
          <select name="sort" defaultValue={filters.sort} className={`${selectClass} mt-1 block`}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="category">Category</option>
            <option value="coordinator">Coordinator</option>
            <option value="completed">Completed date</option>
          </select>
        </label>
      ) : null}
      {extra}
      <button type="submit" className="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800">
        Apply
      </button>
    </form>
  );
}
