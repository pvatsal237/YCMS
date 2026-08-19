import Link from "next/link";
import { requireRole } from "@/lib/session";
import {
  listStaffNotifications,
  markStaffNotificationsRead,
} from "@/services/staff-notifications";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate, formatTime12h } from "@/lib/dates";
import { StaffingResponseForm } from "@/components/volunteer/StaffingResponseForm";

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
  await markStaffNotificationsRead(user.id);

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Volunteer opportunities and assistance requests appear here."
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
                      href={`/members/${row.memberId}`}
                      className="mt-2 inline-block text-sm font-medium text-teal-800"
                    >
                      Open member record
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
