import { AppShell } from "@/components/layout/AppShell";
import { requireStaffSession } from "@/lib/session";
import { getNotificationCounts } from "@/services/dashboard";
import { getVolunteerContext } from "@/services/volunteer";
import { staffDisplayTitle } from "@/utils/format";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffSession();
  const notifications = await getNotificationCounts(user);
  const memberships = user.role === "ATTENDANCE_VOLUNTEER" ? await getVolunteerContext(user.id) : [];
  const departmentCodes = memberships.map((row) => row.department.code);
  const leadCodes = memberships.filter((row) => row.responsibility === "LEAD").map((row) => row.department.code);
  return (
    <AppShell
      user={user}
      notificationCount={notifications.total}
      displayTitle={staffDisplayTitle(user.role, leadCodes)}
      departmentCodes={departmentCodes}
    >
      {children}
    </AppShell>
  );
}
