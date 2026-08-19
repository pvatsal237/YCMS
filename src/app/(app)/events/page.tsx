import { requireRole } from "@/lib/session";
import { listEvents } from "@/services/events";
import { listPendingPlansForReview, listPendingStaffingForReview } from "@/services/volunteer";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/dates";
import { departmentLabel, eventTypeLabel } from "@/utils/format";
import { createEventFormAction } from "@/actions/events";
import { reviewDepartmentPlanAction, reviewStaffingRequestAction } from "@/actions/volunteer";
import { Button } from "@/components/ui/Button";

export default async function EventsPage() {
  const user = await requireRole(["ADMIN", "COORDINATOR", "ATTENDANCE_VOLUNTEER"]);
  const events = await listEvents();
  const pending = user.role === "ATTENDANCE_VOLUNTEER" ? [] : await listPendingStaffingForReview();
  const pendingPlans = user.role === "ATTENDANCE_VOLUNTEER" ? [] : await listPendingPlansForReview();

  return (
    <div className="space-y-6">
      <PageHeader title="Events" description="Weekly meetups, RiseUp, recreation, and special events." />
      {user.role !== "ATTENDANCE_VOLUNTEER" ? (
        <Card>
          <CardHeader title="Create event" />
          <CardBody>
            <form action={createEventFormAction} className="grid gap-3 sm:grid-cols-2">
              <input name="title" placeholder="Title" className="rounded-md border px-3 py-2 text-sm" required />
              <select name="eventType" className="rounded-md border px-3 py-2 text-sm">
                <option value="WEEKLY_MEETUP">Weekly Youth Meetup</option>
                <option value="RISEUP">RiseUp</option>
                <option value="RECREATION">Recreation</option>
                <option value="SPECIAL">Special Event</option>
              </select>
              <input type="date" name="meetupDate" className="rounded-md border px-3 py-2 text-sm" required />
              <input name="location" placeholder="Venue" className="rounded-md border px-3 py-2 text-sm" required />
              <input name="startTime" placeholder="Start (e.g. 20:00)" className="rounded-md border px-3 py-2 text-sm" />
              <input name="endTime" placeholder="End (e.g. 22:00)" className="rounded-md border px-3 py-2 text-sm" />
              <input name="cuisine" placeholder="Cuisine (weekly meetup)" className="rounded-md border px-3 py-2 text-sm sm:col-span-2" />
              <input name="topic" placeholder="Topic (RiseUp)" className="rounded-md border px-3 py-2 text-sm sm:col-span-2" />
              <input name="speakerName" placeholder="Speaker name" className="rounded-md border px-3 py-2 text-sm" />
              <input name="speakerOrganization" placeholder="Speaker organization" className="rounded-md border px-3 py-2 text-sm" />
              <input name="description" placeholder="Description" className="rounded-md border px-3 py-2 text-sm sm:col-span-2" />
              <div className="sm:col-span-2">
                <Button type="submit" size="sm">Save event</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}
      {pendingPlans.length > 0 ? (
        <Card>
          <CardHeader title="Department plans pending approval" />
          <CardBody className="space-y-3 text-sm">
            {pendingPlans.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <p>
                  {departmentLabel(row.department.code)} · {row.meetup.title} · {row.staffingRequests.length} requirements
                </p>
                <div className="flex gap-2">
                  <form action={async () => { await reviewDepartmentPlanAction(row.id, "APPROVED"); }}>
                    <Button type="submit" size="sm">Approve</Button>
                  </form>
                  <form action={async () => { await reviewDepartmentPlanAction(row.id, "CHANGES_REQUESTED"); }}>
                    <Button type="submit" size="sm" variant="secondary">Request changes</Button>
                  </form>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}
      {pending.length > 0 ? (
        <Card>
          <CardHeader title="Staffing requests pending approval" />
          <CardBody className="space-y-3 text-sm">
            {pending.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <p>
                  {row.task} · {row.meetup.title} · {row.neededCount} needed · {formatDate(row.requestDate)}
                </p>
                <div className="flex gap-2">
                  <form
                    action={async () => {
                      await reviewStaffingRequestAction(row.id, "APPROVED");
                    }}
                  >
                    <Button type="submit" size="sm">Approve</Button>
                  </form>
                  <form
                    action={async () => {
                      await reviewStaffingRequestAction(row.id, "REJECTED");
                    }}
                  >
                    <Button type="submit" size="sm" variant="secondary">Reject</Button>
                  </form>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}
      <Card>
        <Table headers={["Event", "Type", "Date", "Venue"]}>
          {events.map((event) => (
            <tr key={event.id}>
              <td className="px-4 py-3 font-medium">{event.title}</td>
              <td className="px-4 py-3"><Badge>{eventTypeLabel(event.eventType)}</Badge></td>
              <td className="px-4 py-3">{formatDate(event.meetupDate)}{event.startTime ? ` · ${event.startTime}` : ""}</td>
              <td className="px-4 py-3">{event.location}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
