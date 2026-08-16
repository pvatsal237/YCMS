import { AppShell } from "@/components/layout/AppShell";
import { requireStaffSession } from "@/lib/session";
import { getNotificationCounts } from "@/services/dashboard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffSession();
  const notifications = await getNotificationCounts(user);
  return (
    <AppShell user={user} notificationCount={notifications.total}>
      {children}
    </AppShell>
  );
}
