export const THREE_CONSECUTIVE_ABSENCE_REASON =
  "3 consecutive meetup absences";

export const OPEN_FOLLOW_UP_STATUSES = ["PENDING", "CONTACTED"] as const;

export const PAGE_SIZE = 20;

export const DEMO_ACCOUNTS = [
  {
    email: "admin@ycms.local",
    role: "ADMIN",
    name: "Amina Okonkwo",
  },
  {
    email: "coordinator@ycms.local",
    role: "COORDINATOR",
    name: "Daniel Chen",
  },
  {
    email: "volunteer@ycms.local",
    role: "ATTENDANCE_VOLUNTEER",
    name: "Sofia Alvarez",
  },
] as const;

/** Development-only password used by the seed script. Never use in production. */
export const DEMO_PASSWORD = "YcmsDemo123!";
