import { randomUUID } from "crypto";
import { logSafe } from "@/lib/log";
import type { EventStatus } from "@prisma/client";

const NULL_CHAR = "\u0000";
const UNSAFE_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const EVENT_STATUSES = new Set<EventStatus>([
  "DRAFT",
  "PUBLISHED",
  "REGISTRATION_CLOSED",
  "COMPLETED",
  "CANCELLED",
]);

/** Safe TEXT id. Prisma `@default(cuid())` is not used on create. */
export function newEventId(): string {
  return randomUUID();
}

/**
 * Safe walk-in token encoding. Never use randomBytes().toString("utf8") / latin1
 * as a Postgres TEXT value — raw bytes can include 0x00.
 * The current Event model has no walkInToken column; this stays hex/uuid-safe
 * if a token is ever written again.
 */
export function newWalkInToken(): string {
  return randomUUID().replaceAll("-", "");
}

export function inspectEventWriteStrings(data: Record<string, unknown>) {
  return Object.entries(data).flatMap(([field, value]) => {
    if (typeof value !== "string") return [];
    return [
      {
        field,
        length: value.length,
        hasNull: value.includes(NULL_CHAR),
        hasUnsafeControl: UNSAFE_CONTROL.test(value),
      },
    ];
  });
}

export function normalizeCreatedById(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replaceAll(NULL_CHAR, "").trim();
  return cleaned || undefined;
}

export function normalizeEventStatus(value: unknown): EventStatus {
  if (typeof value === "string") {
    const cleaned = value.replaceAll(NULL_CHAR, "").trim();
    if (EVENT_STATUSES.has(cleaned as EventStatus)) return cleaned as EventStatus;
  }
  return "DRAFT";
}

export function stripNullBytesFromStrings<T extends Record<string, unknown>>(data: T): T {
  const next = { ...data };
  for (const [key, value] of Object.entries(next)) {
    if (typeof value === "string" && value.includes(NULL_CHAR)) {
      (next as Record<string, unknown>)[key] = value.replaceAll(NULL_CHAR, "");
    }
  }
  return next;
}

export function prepareEventWritePayload<T extends Record<string, unknown>>(
  data: T,
  options: { assignId: boolean },
) {
  const createdById = normalizeCreatedById(
    typeof data.createdById === "string" ? data.createdById : undefined,
  );
  const payload = {
    ...data,
    ...(options.assignId ? { id: newEventId() } : {}),
    status: normalizeEventStatus(data.status),
    createdById,
  };

  const fields = inspectEventWriteStrings(payload);
  logSafe("event.prisma_write_strings", { fields });
  const nullFields = fields.filter((field) => field.hasNull).map((field) => field.field);
  if (nullFields.length) {
    logSafe("event.prisma_write_null_fields", { fields: nullFields });
    return { payload: stripNullBytesFromStrings(payload), fields };
  }
  return { payload, fields };
}
