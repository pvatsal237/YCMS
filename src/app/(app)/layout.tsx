import { AppShell } from "@/components/layout/AppShell";
import { requireCoordinator } from "@/lib/session";
import { unreadNotificationCount } from "@/services/notifications";

export default async function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCoordinator();
  const notificationCount = await unreadNotificationCount(user.id).catch(() => 0);
  return (
    <AppShell user={user} notificationCount={notificationCount}>
      {children}
    </AppShell>
  );
}
