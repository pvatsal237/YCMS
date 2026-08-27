import type { GuidanceCategory, GuidanceStatus } from "@prisma/client";

export type GuidanceRange = "all" | "today" | "month" | "quarter" | "custom";
export type GuidanceSort = "newest" | "oldest" | "category" | "coordinator" | "completed";

export type GuidanceReportFilters = {
  range: GuidanceRange;
  from?: string;
  to?: string;
  category?: GuidanceCategory | "";
  status?: GuidanceStatus | "";
  coordinatorId?: string;
  event: string;
  sort: GuidanceSort;
};

const CATEGORIES = new Set<GuidanceCategory>([
  "IMMIGRATION",
  "CAREER_DEVELOPMENT",
  "RESUME_INTERVIEW",
  "TECHNOLOGY_IT",
  "AI",
  "FINANCE",
  "ENGINEERING",
  "EDUCATION",
  "ENTREPRENEURSHIP",
  "OTHER",
]);

const STATUSES = new Set<GuidanceStatus>(["NEW", "CLAIMED", "WAITING_FOR_MEMBER", "RESOLVED"]);
const RANGES = new Set<GuidanceRange>(["all", "today", "month", "quarter", "custom"]);
const SORTS = new Set<GuidanceSort>(["newest", "oldest", "category", "coordinator", "completed"]);

export function customDateFieldsVisible(range: GuidanceRange) {
  return range === "custom";
}

export function parseGuidanceReportFilters(params: Record<string, string | undefined>): GuidanceReportFilters {
  const range = RANGES.has(params.range as GuidanceRange) ? (params.range as GuidanceRange) : "all";
  const sort = SORTS.has(params.sort as GuidanceSort) ? (params.sort as GuidanceSort) : "newest";
  const category = CATEGORIES.has(params.category as GuidanceCategory) ? (params.category as GuidanceCategory) : "";
  const status = STATUSES.has(params.status as GuidanceStatus) ? (params.status as GuidanceStatus) : "";
  const custom = range === "custom";
  return {
    range,
    from: custom ? params.from || undefined : undefined,
    to: custom ? params.to || undefined : undefined,
    category,
    status,
    coordinatorId: params.coordinator || undefined,
    event: params.event || "all",
    sort,
  };
}

export function buildGuidanceQuery(filters: GuidanceReportFilters, extra: Record<string, string> = {}) {
  const query = new URLSearchParams({ range: filters.range, event: filters.event, sort: filters.sort, ...extra });
  if (filters.range === "custom") {
    if (filters.from) query.set("from", filters.from);
    if (filters.to) query.set("to", filters.to);
  }
  if (filters.category) query.set("category", filters.category);
  if (filters.status) query.set("status", filters.status);
  if (filters.coordinatorId) query.set("coordinator", filters.coordinatorId);
  return query.toString();
}

export function guidanceDateRange(filters: Pick<GuidanceReportFilters, "range" | "from" | "to">, now = new Date()) {
  if (filters.range === "all") {
    return { from: undefined, to: undefined };
  }
  if (filters.range === "today") {
    return {
      from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
      to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)),
    };
  }
  if (filters.range === "quarter") {
    const quarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
    return {
      from: new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1)),
      to: new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999)),
    };
  }
  if (filters.range === "custom") {
    const from = filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : undefined;
    const to = filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined;
    return { from, to };
  }
  return {
    from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)),
  };
}

export function isValidCustomDateRange(from?: string, to?: string) {
  if (!from || !to) return true;
  return from <= to;
}

export function recordMatchesGuidanceRange(createdAt: Date, range: { from?: Date; to?: Date }) {
  if (range.from && createdAt < range.from) return false;
  if (range.to && createdAt > range.to) return false;
  return true;
}

export function utcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function utcMonthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

export function utcQuarterKey(date: Date) {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${date.getUTCFullYear()}`;
}

export function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

export function formatDayLabel(key: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${key}T00:00:00.000Z`));
}

export function groupCounts(keys: string[]) {
  const counts = new Map<string, number>();
  for (const key of keys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => ({ key, count }));
}

export function groupGuidanceByDay(dates: Date[]) {
  return groupCounts(dates.map(utcDayKey)).sort((a, b) => a.key.localeCompare(b.key));
}

export function groupGuidanceByMonth(dates: Date[]) {
  return groupCounts(dates.map(utcMonthKey)).sort((a, b) => a.key.localeCompare(b.key));
}

export function groupGuidanceByQuarter(dates: Date[]) {
  return groupCounts(dates.map(utcQuarterKey));
}

export function groupGuidanceByEvent(rows: Array<{ eventTitle: string | null }>) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.eventTitle || "No Event Linked";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => ({ key, count }));
}

export function sortGuidanceRows<
  T extends {
    createdAt: Date;
    category: string;
    resolvedAt: Date | null;
    claimedByName: string | null;
  },
>(rows: T[], sort: GuidanceSort) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === "oldest") return a.createdAt.getTime() - b.createdAt.getTime();
    if (sort === "category") return a.category.localeCompare(b.category);
    if (sort === "coordinator") return (a.claimedByName || "").localeCompare(b.claimedByName || "");
    if (sort === "completed") return (a.resolvedAt?.getTime() ?? 0) - (b.resolvedAt?.getTime() ?? 0);
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  return copy;
}
