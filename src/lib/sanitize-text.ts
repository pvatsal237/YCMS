const NULL_CHAR = "\u0000";

export const EVENT_TEXT_FIELDS = [
  "title",
  "description",
  "speakerName",
  "speakerTitle",
  "speakerOrganization",
  "location",
  "internalNotes",
] as const;

export type EventTextField = (typeof EVENT_TEXT_FIELDS)[number];

export function containsNullCharacters(value: unknown): boolean {
  return typeof value === "string" && value.includes(NULL_CHAR);
}

export function sanitizeEventText(value: unknown): string {
  return String(value ?? "").replaceAll(NULL_CHAR, "").trim();
}

export function inspectEventTextFields(input: Record<string, unknown>) {
  return EVENT_TEXT_FIELDS.map((field) => {
    const raw = input[field];
    const text = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
    return {
      field,
      length: text.length,
      hadNull: containsNullCharacters(text),
    };
  });
}

export function sanitizeFormString(value: unknown): string {
  return sanitizeEventText(value);
}

export function sanitizeEventFormData(formData: FormData) {
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      formData.set(key, sanitizeFormString(value));
    }
  }
  return formData;
}
