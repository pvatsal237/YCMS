import { requireRole } from "@/lib/session";
import { getVolunteerHomeData } from "@/services/volunteer";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/dates";
import { departmentLabel, eventTypeLabel } from "@/utils/format";
import { respondStaffingAction } from "@/actions/volunteer";
import { Button } from "@/components/ui/Button";

export default async function VolunteerHomePage() {
  const user = await requireRole(["ATTENDANCE_VOLUNTEER"]);
  const data = await getVolunteerHomeData(user.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Home" description="Your departments, events, and assignments." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="My departments" />
          <CardBody className="space-y-2 text-sm">
            {data.memberships.length === 0 ? (
              <p className="text-slate-500">No department assigned yet.</p>
            ) : (
              data.memberships.map((row) => (
                <p key={row.id}>
                  {departmentLabel(row.department.code)}{" "}
                  <Badge>{row.responsibility === "LEAD" ? "Lead" : "Volunteer"}</Badge>
                </p>
              ))
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Upcoming events" />
          <CardBody className="space-y-2 text-sm">
            {data.upcomingEvents.length === 0 ? (
              <p className="text-slate-500">No upcoming events.</p>
            ) : (
              data.upcomingEvents.map((event) => (
                <div key={event.id}>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-slate-500">
                    {eventTypeLabel(event.eventType)} · {formatDate(event.meetupDate)}
                    {event.startTime ? ` · ${event.startTime}` : ""} · {event.location}
                  </p>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader title="My assignments" />
        <CardBody className="space-y-2 text-sm">
          {data.assignments.length === 0 ? (
            <p className="text-slate-500">No assignments yet.</p>
          ) : (
            data.assignments.map((row) => (
              <p key={row.id}>
                {row.request.task} · {row.request.meetup.title} · {formatDate(row.request.requestDate)}
              </p>
            ))
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Open volunteer requests" />
        <CardBody className="space-y-4">
          {data.openRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No open requests for your departments.</p>
          ) : (
            data.openRequests.map((request) => (
              <form key={request.id} action={respondStaffingAction} className="rounded-md border border-slate-200 p-3 text-sm">
                <input type="hidden" name="requestId" value={request.id} />
                <p className="font-medium">{request.task}</p>
                <p className="text-slate-500">
                  {request.meetup.title} · {departmentLabel(request.department.code)} · needed {request.neededCount} ·{" "}
                  {formatDate(request.requestDate)} · {request.startTime}–{request.endTime}
                </p>
                {request.notes ? <p className="mt-1">{request.notes}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <select name="status" className="rounded-md border border-slate-300 px-2 py-1" defaultValue="AVAILABLE">
                    <option value="AVAILABLE">Available</option>
                    <option value="PARTIAL">Partially available</option>
                    <option value="NOT_AVAILABLE">Not available</option>
                  </select>
                  <input name="startTime" placeholder="From" className="w-24 rounded-md border px-2 py-1" />
                  <input name="endTime" placeholder="To" className="w-24 rounded-md border px-2 py-1" />
                  <Button type="submit" size="sm">Save</Button>
                </div>
              </form>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
