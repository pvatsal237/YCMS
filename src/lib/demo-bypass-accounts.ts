export const DEMO_BYPASS_EMAILS = ["pvatsal237@gmail.com", "srushtipatel0904@gmail.com"] as const;

export const DEMO_BYPASS_INVALID_MESSAGE = "Invalid demo credentials.";

export function isDemoBypassEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return (DEMO_BYPASS_EMAILS as readonly string[]).includes(normalized);
}
