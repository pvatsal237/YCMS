import Link from "next/link";
import { requireSession } from "@/lib/session";
import { listNotifications } from "@/services/notifications";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate } from "@/lib/dates";
import { MarkNotificationsSeen } from "@/components/notifications/MarkNotificationsSeen";

export default async function NotificationsPage() {
  const user = await requireSession();
  const rows = await listNotifications(user.id);
  return (
    <div>
      <MarkNotificationsSeen />
      <PageHeader title="Notifications" description="The badge count matches this list." />
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No notifications yet" description="Event and guidance updates will show here." />
        ) : (
          <CardBody className="divide-y divide-slate-100 p-0">
            {rows.map((row) => (
              <div key={row.id} className="px-5 py-4">
                <div className="flex justify-between gap-2">
                  <p className="font-medium">{row.title}</p>
                  <p className="text-xs text-slate-500">{formatDate(row.createdAt)}</p>
                </div>
                <p className="mt-1 text-sm text-slate-700">{row.message}</p>
                {row.href ? (
                  <Link href={row.href} className="mt-2 inline-block text-sm font-medium text-teal-800">Open</Link>
                ) : null}
              </div>
            ))}
          </CardBody>
        )}
      </Card>
    </div>
  );
}
