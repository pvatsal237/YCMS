import { requireCoordinator } from "@/lib/session";
import { listNotifications } from "@/services/notifications";
import { PageHeader } from "@/components/ui/Feedback";
import { formatDateTime } from "@/lib/dates";
import { MarkSeen } from "@/components/notifications/MarkSeen";
import Link from "next/link";

export default async function NotificationsPage() {
  const user = await requireCoordinator();
  const rows = await listNotifications(user.id);
  return (
    <div>
      <MarkSeen />
      <PageHeader title="Notifications" />
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-stone-200 bg-white px-4 py-3">
            <p className="font-medium text-stone-900">{row.title}</p>
            <p className="text-sm text-stone-600">{row.body}</p>
            <p className="text-xs text-stone-400">{formatDateTime(row.createdAt)}</p>
            {row.href ? <Link href={row.href} className="text-sm text-teal-800">Open</Link> : null}
          </div>
        ))}
        {rows.length === 0 ? <p className="text-sm text-stone-500">No notifications.</p> : null}
      </div>
    </div>
  );
}
