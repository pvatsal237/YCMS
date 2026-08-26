type AuthErrorSummary = {
  oauthStage?: string;
  oauthError?: string;
  oauthCode?: string;
  httpStatus?: number;
  prismaCode?: string;
};

function chain(error: unknown): unknown[] {
  const items: unknown[] = [error];
  if (typeof error !== "object" || !error || !("cause" in error)) return items;
  const cause = (error as { cause?: unknown }).cause;
  items.push(cause);
  if (typeof cause === "object" && cause && "err" in cause) {
    items.push((cause as { err?: unknown }).err);
    const inner = (cause as { err?: { cause?: unknown } }).err;
    if (inner && typeof inner === "object" && "cause" in inner) items.push(inner.cause);
  }
  return items;
}

export function summarizeAuthError(error: unknown): AuthErrorSummary {
  const summary: AuthErrorSummary = {};
  for (const item of chain(error)) {
    if (typeof item !== "object" || !item) continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.code === "string" && rec.code.startsWith("OAUTH_")) {
      summary.oauthCode = rec.code;
    }
    if (typeof rec.code === "string" && /^P\d{4}$/.test(rec.code)) {
      summary.prismaCode = rec.code;
    }
    if (typeof rec.error === "string" && rec.error && !rec.error.includes(" ")) {
      summary.oauthError = rec.error;
    }
    if (typeof rec.status === "number") {
      summary.httpStatus = rec.status;
    }
  }
  if (summary.oauthCode === "OAUTH_RESPONSE_BODY_ERROR") {
    summary.oauthStage = "token endpoint";
  } else if (summary.oauthCode === "OAUTH_AUTHORIZATION_RESPONSE_ERROR") {
    summary.oauthStage = "authorization redirect";
  } else if (summary.oauthCode === "OAUTH_JWT_USERINFO_EXPECTED") {
    summary.oauthStage = "userinfo endpoint";
  } else if (summary.oauthCode?.includes("JWT") || summary.oauthCode === "OAUTH_INVALID_RESPONSE") {
    summary.oauthStage = "ID token/profile parsing";
  }
  return summary;
}

function envPresence() {
  return {
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
    AUTH_GOOGLE_ID: Boolean(process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID),
    AUTH_GOOGLE_SECRET: Boolean(process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET),
    AUTH_URL: Boolean(process.env.AUTH_URL),
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
  };
}

export function logAuthStageFailure(stage: string, error: unknown) {
  const summary = summarizeAuthError(error);
  console.error("[IYCM auth] failed", {
    stage,
    oauthStage: summary.oauthStage,
    oauthError: summary.oauthError,
    oauthCode: summary.oauthCode,
    httpStatus: summary.httpStatus,
    prismaCode: summary.prismaCode,
    ...envPresence(),
  });
}
