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
