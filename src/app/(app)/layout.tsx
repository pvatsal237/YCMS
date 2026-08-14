import { AppShell } from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { getNotificationCounts } from "@/services/dashboard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();
  const notifications = await getNotificationCounts(user.role);
  return (
    <AppShell user={user} notificationCount={notifications.total}>
      {children}
    </AppShell>
  );
}
