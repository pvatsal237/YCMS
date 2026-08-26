export function maskPhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "—";
  return `******${digits.slice(-4)}`;
}

export function maskEmail(email: string | null | undefined): string {
  const value = (email ?? "").trim().toLowerCase();
  const at = value.indexOf("@");
  if (at <= 0) return "(none)";
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function splitDisplayName(name: string | null | undefined, email: string) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    const local = email.split("@")[0] ?? "Member";
    return { firstName: local, lastName: "" };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function appUrl(path = "") {
  const base = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
