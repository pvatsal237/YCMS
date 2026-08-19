export const SCHEDULE_CONFLICT_MESSAGE =
  "You are already assigned to another activity during this time.";

export function timeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  if (aStart == null || aEnd == null || bStart == null || bEnd == null) return false;
  return aStart < bEnd && bStart < aEnd;
}

export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function sameUtcDate(a: Date, b: Date): boolean {
  return utcDateKey(a) === utcDateKey(b);
}

export function assignmentFitsAvailability(
  taskStart: string,
  taskEnd: string,
  availableStart: string,
  availableEnd: string,
): boolean {
  const taskFrom = timeToMinutes(taskStart);
  const taskTo = timeToMinutes(taskEnd);
  const availFrom = timeToMinutes(availableStart);
  const availTo = timeToMinutes(availableEnd);
  if (taskFrom == null || taskTo == null || availFrom == null || availTo == null) return false;
  return availFrom <= taskFrom && availTo >= taskTo;
}

export type ScheduleWindow = {
  dateKey: string;
  startTime: string;
  endTime: string;
};

export function windowsOverlap(a: ScheduleWindow, b: ScheduleWindow): boolean {
  return a.dateKey === b.dateKey && rangesOverlap(a.startTime, a.endTime, b.startTime, b.endTime);
}

export function staffingShortage(needed: number, confirmed: number): number {
  return Math.max(0, needed - confirmed);
}

export function staffingFillLabel(needed: number, confirmed: number): "OPEN" | "FILLED" {
  return staffingShortage(needed, confirmed) > 0 ? "OPEN" : "FILLED";
}

export function shiftIsoDate(iso: string, days: number): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const KITCHEN_LEAD_BLOCKED_DEPARTMENTS = ["SEATING_SETUP"] as const;

export const KITCHEN_LEAD_SEATING_MESSAGE =
  "Kitchen leads stay with food preparation through the end of the event, so they cannot volunteer for Seating & Setup.";

export function isLeadForDepartment(
  memberships: Array<{ departmentId: string; responsibility: string }>,
  departmentId: string,
): boolean {
  return memberships.some((row) => row.departmentId === departmentId && row.responsibility === "LEAD");
}

export function kitchenLeadMembershipConflict(leadCodes: string[], memberCodes: string[]): string | null {
  if (leadCodes.includes("KITCHEN") && memberCodes.includes("SEATING_SETUP")) {
    return KITCHEN_LEAD_SEATING_MESSAGE;
  }
  return null;
}
