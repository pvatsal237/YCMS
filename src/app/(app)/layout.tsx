import { AppShell } from "@/components/layout/AppShell";
import { requireStaffSession } from "@/lib/session";
import { getNotificationCounts } from "@/services/dashboard";
import { getVolunteerContext } from "@/services/volunteer";
import { staffDisplayTitle } from "@/utils/format";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffSession();
  let notificationCount = 0;
  let departmentCodes: string[] = [];
  let leadCodes: string[] = [];
  try {
    const notifications = await getNotificationCounts(user);
    notificationCount = notifications.total;
    const memberships = user.role === "ATTENDANCE_VOLUNTEER" ? await getVolunteerContext(user.id) : [];
    departmentCodes = memberships.map((row) => row.department.code);
    leadCodes = memberships.filter((row) => row.responsibility === "LEAD").map((row) => row.department.code);
  } catch {
    notificationCount = 0;
  }
  return (
    <AppShell
      user={user}
      notificationCount={notificationCount}
      displayTitle={staffDisplayTitle(user.role, leadCodes)}
      departmentCodes={departmentCodes}
    >
      {children}
    </AppShell>
  );
}
