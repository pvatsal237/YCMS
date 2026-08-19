import { formatDate } from "@/lib/dates";
import type { UserRole } from "@/types/roles";

export function fullName(member: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}): string {
  return [member.firstName, member.middleName, member.lastName]
    .filter(Boolean)
    .join(" ");
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "COORDINATOR":
      return "Youth Coordinator";
    case "ATTENDANCE_VOLUNTEER":
      return "Volunteer";
    case "MEMBER":
      return "Member";
  }
}

export function immigrationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    STUDENT: "Student",
    WORKER: "Worker",
    PERMANENT_RESIDENT: "Permanent Resident",
    CITIZEN: "Citizen",
    VISITOR: "Visitor",
    OTHER: "Other",
  };
  return labels[status] ?? status;
}

export function documentRequestTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    NEED_ASSISTANCE: "Needs to speak with staff",
    RENEWAL_REQUESTED: "Applied for renewal",
    RENEWED: "Already renewed",
    IRCC_QUERY: "Has a query (for example IRCC)",
  };
  return labels[type] ?? type;
}

export function documentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    STUDY_PERMIT: "Study Permit",
    WORK_PERMIT: "Work Permit",
    PR_CARD: "PR Card",
    PASSPORT: "Passport",
  };
  return labels[type] ?? type;
}

export function attendanceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PRESENT: "Present",
    ABSENT: "Absent",
    EXCUSED: "Excused",
  };
  return labels[status] ?? status;
}

export function followUpStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "Pending",
    CONTACTED: "Contacted",
    COMPLETED: "Completed",
    UNABLE_TO_REACH: "Unable to reach",
  };
  return labels[status] ?? status;
}

export function assistanceCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    IMMIGRATION_DOCUMENT: "Immigration document",
    EDUCATION: "Education",
    EMPLOYMENT: "Employment",
    ACCOMMODATION: "Accommodation",
    MEETUP: "Meetup",
    PERSONAL: "Personal / general",
    OTHER: "Other",
  };
  return labels[category] ?? category;
}

export function assistanceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NEW: "New",
    ASSIGNED: "Assigned",
    IN_PROGRESS: "In progress",
    WAITING_FOR_MEMBER: "Waiting for member",
    RESOLVED: "Resolved",
    CLOSED: "Closed",
  };
  return labels[status] ?? status;
}

export function eventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    WEEKLY_MEETUP: "Weekly Youth Meetup",
    RISEUP: "RiseUp",
    RECREATION: "Recreation",
    SPECIAL: "Special Event",
  };
  return labels[type] ?? type;
}

export function departmentLabel(code: string): string {
  const labels: Record<string, string> = {
    KITCHEN: "Kitchen / Food Preparation",
    GROCERIES: "Groceries",
    TRANSPORTATION: "Transportation",
    SEATING_SETUP: "Seating & Setup",
    AUDIO_VIDEO: "Audio / Video",
    RECREATION: "Recreation",
    RISEUP_SUPPORT: "RiseUp Event Support",
    GENERAL_EVENT_SUPPORT: "General Event Support",
  };
  return labels[code] ?? code;
}

export function employmentSummary(employment?: {
  employmentStatus: string;
  employer?: string | null;
  jobTitle?: string | null;
} | null): string {
  if (!employment) return "—";
  if (employment.employer && employment.jobTitle) {
    return `${employment.jobTitle} · ${employment.employer}`;
  }
  if (employment.employer) return employment.employer;
  return employment.employmentStatus.replaceAll("_", " ").toLowerCase();
}

export function educationSummary(
  education: Array<{ institution: string; program: string; currentlyStudying: boolean }>,
): string {
  const current = education.find((item) => item.currentlyStudying) ?? education[0];
  if (!current) return "—";
  return `${current.program} · ${current.institution}`;
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export { formatDate };
