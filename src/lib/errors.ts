export class AppError extends Error {
  readonly userMessage: string;
  readonly status: number;
  readonly code?: string;

  constructor(userMessage: string, status = 400, code?: string) {
    super(userMessage);
    this.name = "AppError";
    this.userMessage = userMessage;
    this.status = status;
    this.code = code;
  }
}

export function isNextInterruptError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"));
}

export function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) return error.userMessage;
  const message = error instanceof Error ? error.message : "";
  if (/22021|invalid byte sequence|utf8|null character|\\u0000/i.test(message)) {
    return "The event text contains a character that cannot be stored. Remove any copied control characters and try again.";
  }
  if (/Invalid.*DateTime|Invalid Date/i.test(message)) {
    return "Please select a valid event date.";
  }
  if (/Argument `capacity`|walkInCapacity|NaN|must be.*Int/i.test(message)) {
    return "Please enter a valid capacity.";
  }
  return fallback;
}

export { logServerError } from "@/lib/log";
