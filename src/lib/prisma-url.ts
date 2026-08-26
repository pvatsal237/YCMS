/**
 * Neon/Vercel pooled Postgres rejects Prisma prepared statements unless
 * pgbouncer=true is set. Do not log the URL.
 */
export function applyServerlessPrismaParams(databaseUrl: string): string {
  const isPooler = /[-.]pooler[.-]/i.test(databaseUrl) || databaseUrl.includes("-pooler");
  if (!isPooler) return databaseUrl;

  let next = databaseUrl;
  if (!/[?&]pgbouncer=true(?:&|$)/i.test(next)) {
    next += next.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true";
  }
  if (!/[?&]connection_limit=/i.test(next)) {
    next += "&connection_limit=1";
  }
  return next;
}
