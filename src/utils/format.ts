import { formatDate } from "@/lib/dates";
import type { UserRole } from "@/types/roles";

export function fullName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function roleLabel(role: UserRole): string {
  return role === "COORDINATOR" ? "Coordinator" : "Member";
}

export function eventStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PUBLISHED: "Published",
    REGISTRATION_CLOSED: "Registration closed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return labels[status] ?? status;
}

export function guidanceCategoryLabel(category: string) {
  const labels: Record<string, string> = {
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
  return labels[category] ?? category;
}

export function guidanceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    NEW: "New",
    CLAIMED: "Claimed",
    WAITING_FOR_MEMBER: "Waiting for member",
    RESOLVED: "Resolved",
  };
  return labels[status] ?? status;
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export { formatDate };
