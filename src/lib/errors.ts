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

export function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) return error.userMessage;
  return fallback;
}

export { logServerError } from "@/lib/log";
