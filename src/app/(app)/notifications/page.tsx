import Link from "next/link";
import { requireRole } from "@/lib/session";
import {
  listStaffNotifications,
} from "@/services/staff-notifications";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate, formatTime12h } from "@/lib/dates";
import { StaffingResponseForm } from "@/components/volunteer/StaffingResponseForm";
import { MarkNotificationsSeen } from "@/components/notifications/MarkNotificationsSeen";

export default async function NotificationsPage() {
  const user = await requireRole(["ADMIN", "COORDINATOR", "ATTENDANCE_VOLUNTEER"]);
  const rows = await listStaffNotifications(user.id);
  const staffingIds = [...new Set(rows.map((row) => row.requestId).filter(Boolean))] as string[];
  const staffing = staffingIds.length
    ? await prisma.volunteerStaffingRequest.findMany({
        where: { id: { in: staffingIds } },
        include: { meetup: true, department: true, assignments: true },
      })
    : [];
  const staffingById = new Map(staffing.map((row) => [row.id, row]));

  return (
    <div>
      <MarkNotificationsSeen />
      <PageHeader
        title="Notifications"
        description="Open this page to review updates. Unread items show on the bell; they clear after you open them here."
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="When a staffing requirement has open spots, or a member requests help, it will show here."
          />
        ) : (
          <CardBody className="divide-y divide-slate-100 p-0">
            {rows.map((row) => {
              const request = row.requestId ? staffingById.get(row.requestId) : undefined;
              return (
                <div key={row.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{row.title}</p>
                    <p className="text-xs text-slate-500">{formatDate(row.createdAt)}</p>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{row.message}</p>
                  {request ? (
                    <div className="mt-2 text-sm text-slate-600">
                      <p>Event: {request.meetup.title}</p>
                      <p>Department: {request.department.name}</p>
                      <p>Task: {request.task}</p>
                      <p>
                        Date: {formatDate(request.requestDate)} · {formatTime12h(request.startTime)}–
                        {formatTime12h(request.endTime)}
                      </p>
                      <p>Remaining spots: {Math.max(0, request.neededCount - request.assignments.length)}</p>
                      {user.role === "ATTENDANCE_VOLUNTEER" && request.neededCount > request.assignments.length ? (
                        <StaffingResponseForm requestId={request.id} />
                      ) : null}
                    </div>
                  ) : null}
                  {row.memberId ? (
                    <Link
                      href={user.role === "ATTENDANCE_VOLUNTEER" ? "/volunteer" : `/members/${row.memberId}`}
                      className="mt-2 inline-block text-sm font-medium text-teal-800"
                    >
                      Open member record
                    </Link>
                  ) : null}
                  {user.role !== "ATTENDANCE_VOLUNTEER" &&
                  (row.title.toLowerCase().includes("would like to serve") ||
                    row.title.toLowerCase().includes("someone would like")) ? (
                    <Link href="/volunteers" className="mt-2 inline-block text-sm font-medium text-teal-800">
                      Review serving request
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </CardBody>
        )}
      </Card>
    </div>
  );
}
