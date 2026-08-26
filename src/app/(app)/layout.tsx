import { AppShell } from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { countUnreadNotifications } from "@/services/notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();
  const notificationCount = await countUnreadNotifications(user.id);
  return (
    <AppShell user={user} notificationCount={notificationCount}>
      {children}
    </AppShell>
  );
}
