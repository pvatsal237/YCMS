const SECRET_KEYS = /^(otp|password|secret|token|authorization|database_url|smtp|pepper|codehash)$|otpcode|rawotp|sessiontoken/i;

export function logSafe(context: string, detail?: Record<string, unknown>) {
  if (!detail) {
    console.info(`[IYCM] ${context}`);
    return;
  }
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (SECRET_KEYS.test(key)) continue;
    if (typeof value === "string" && value.length > 500) {
      cleaned[key] = `${value.slice(0, 80)}…`;
      continue;
    }
    cleaned[key] = value;
  }
  console.info(`[IYCM] ${context}`, cleaned);
}

export function logServerError(context: string, error: unknown) {
  const detail =
    error instanceof Error ? { name: error.name, message: error.message } : { error: "unknown" };
  console.error(`[IYCM] ${context}`, detail);
}
