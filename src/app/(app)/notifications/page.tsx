import Link from "next/link";
import { requireRole } from "@/lib/session";
import {
  listStaffNotifications,
  markStaffNotificationsRead,
} from "@/services/staff-notifications";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate } from "@/lib/dates";

export default async function NotificationsPage() {
  const user = await requireRole(["ADMIN", "COORDINATOR"]);
  const rows = await listStaffNotifications(user.id);
  await markStaffNotificationsRead(user.id);

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Assistance requests from members appear here and are also sent to your email."
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="When a member requests help about an expiring document, it will show here."
          />
        ) : (
          <CardBody className="divide-y divide-slate-100 p-0">
            {rows.map((row) => (
              <div key={row.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{row.title}</p>
                  <p className="text-xs text-slate-500">{formatDate(row.createdAt)}</p>
                </div>
                <p className="mt-1 text-sm text-slate-700">{row.message}</p>
                {row.memberId ? (
                  <Link
                    href={`/members/${row.memberId}`}
                    className="mt-2 inline-block text-sm font-medium text-teal-800"
                  >
                    Open member record
                  </Link>
                ) : null}
              </div>
            ))}
          </CardBody>
        )}
      </Card>
    </div>
  );
}
