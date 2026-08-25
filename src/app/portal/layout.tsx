import { AppShell } from "@/components/layout/AppShell";
import { requireMemberSession } from "@/lib/session";
import { unreadNotificationCount } from "@/services/notifications";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireMemberSession();
  const notificationCount = await unreadNotificationCount(user.id).catch(() => 0);
  return (
    <AppShell user={user} notificationCount={notificationCount}>
      {children}
    </AppShell>
  );
}
