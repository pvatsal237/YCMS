export function maskPhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "—";
  return `******${digits.slice(-4)}`;
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
