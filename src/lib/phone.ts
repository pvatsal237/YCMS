export function formatPhoneDisplay(phone: string | null | undefined) {
  if (!phone?.trim()) return "Not provided";
  const digits = phone.replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length === 10) {
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return phone.replace(/\*/g, "").trim() || "Not provided";
}

export function storePhone(phone: string | null | undefined) {
  const formatted = formatPhoneDisplay(phone);
  return formatted === "Not provided" ? null : formatted;
}
