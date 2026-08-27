import { formatDate } from "@/lib/dates";
import type { UserRole } from "@/types/roles";
import type { GuidanceCategory } from "@prisma/client";

export const GUIDANCE_LABELS: Record<GuidanceCategory, string> = {
  IMMIGRATION: "Immigration",
  CAREER_DEVELOPMENT: "Career Development",
  RESUME_INTERVIEW: "Resume / Interview",
  TECHNOLOGY_IT: "Technology / IT",
  AI: "AI",
  FINANCE: "Finance",
  ENGINEERING: "Engineering",
  EDUCATION: "Education",
  ENTREPRENEURSHIP: "Entrepreneurship",
  OTHER: "Other",
};

export function fullName(member: { firstName: string; lastName: string; middleName?: string | null }) {
  return [member.firstName, member.middleName, member.lastName].filter(Boolean).join(" ");
}

export function roleLabel(role: UserRole): string {
  return role === "COORDINATOR" ? "Coordinator" : "Member";
}

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function eventTitleParts(title: string) {
  const index = title.indexOf(":");
  if (index === -1) return { heading: title.trim(), subtitle: null as string | null };
  return {
    heading: title.slice(0, index).trim(),
    subtitle: title.slice(index + 1).trim() || null,
  };
}

export function eventStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PUBLISHED: "Published",
    REGISTRATION_CLOSED: "Registration Closed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return labels[status] ?? status;
}

export function registrationTypeLabel(type: string) {
  if (type === "WALK_IN") return "Walk-in";
  return "Standard";
}

export function registrationLabel(status: string) {
  const labels: Record<string, string> = {
    REGISTERED: "Registered",
    WAITLISTED: "Waitlisted",
    CANCELLED: "Cancelled",
  };
  return labels[status] ?? status;
}

export function checkInLabel(status: string) {
  const labels: Record<string, string> = {
    REGISTERED: "Registered",
    CHECKED_IN: "Checked In",
    NO_SHOW: "No Show",
  };
  return labels[status] ?? status;
}

export function guidanceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    NEW: "New",
    CLAIMED: "Claimed",
    WAITING_FOR_MEMBER: "Waiting for Member",
    RESOLVED: "Resolved",
  };
  return labels[status] ?? status;
}

export { formatDate };

export function guidanceStatusTone(status: string): "teal" | "yellow" | "orange" | "green" | "slate" {
  if (status === "NEW") return "teal";
  if (status === "CLAIMED") return "yellow";
  if (status === "WAITING_FOR_MEMBER") return "orange";
  if (status === "RESOLVED") return "green";
  return "slate";
}

export function previewText(value: string, max = 140) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
