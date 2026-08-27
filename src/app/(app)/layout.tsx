import { AppShell } from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { countUnreadNotifications } from "@/services/notifications";
import { logServerError } from "@/lib/errors";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();
  let notificationCount = 0;
  try {
    notificationCount = await countUnreadNotifications(user.id);
  } catch (error) {
    logServerError("layout.notifications", error);
  }
  return (
    <AppShell user={user} notificationCount={notificationCount}>
      {children}
    </AppShell>
  );
}
