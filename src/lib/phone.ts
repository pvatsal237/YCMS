export function formatPhoneDisplay(phone: string | null | undefined) {
  if (!phone?.trim()) return "—";
  const digits = phone.replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length === 10) {
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return phone.trim();
}

export function storePhone(phone: string | null | undefined) {
  const formatted = formatPhoneDisplay(phone);
  return formatted === "—" ? null : formatted;
}
