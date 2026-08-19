import { requireRole } from "@/lib/session";
import { getVolunteerHomeData } from "@/services/volunteer";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, formatTime12h } from "@/lib/dates";
import { departmentLabel, departmentPlanStatusLabel, departmentShortLabel, staffingRequirementBadge } from "@/utils/format";
import { StaffingResponseForm } from "@/components/volunteer/StaffingResponseForm";
import Link from "next/link";

export default async function VolunteerHomePage() {
  const user = await requireRole(["ATTENDANCE_VOLUNTEER"]);
  const data = await getVolunteerHomeData(user.id);

  const leadMemberships = data.memberships.filter(
    (row) => row.responsibility === "LEAD" || row.department.leadUserId === user.id,
  );
  const teamMemberships = data.memberships.filter((row) => row.responsibility !== "LEAD");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home"
        description={
          leadMemberships.length > 0
            ? teamMemberships.length > 0
              ? `You are the department lead for ${leadMemberships.map((row) => departmentShortLabel(row.department.code)).join(" and ")}. Listed separately are other teams you help on.`
              : `You are the department lead for ${leadMemberships.map((row) => departmentShortLabel(row.department.code)).join(" and ")}. Kitchen leads stay with food preparation through the end of the event.`
            : "Your volunteer teams, events, and assignments."
        }
      />

      {data.leadDashboards.map((lead) => (
        <Card key={lead.department.id}>
          <CardHeader
            title={lead.event ? lead.event.title : "No upcoming event"}
            description={`You are the ${departmentShortLabel(lead.department.code)} department lead`}
            action={
              lead.event && lead.canEditPlan !== false ? (
                <Link href={`/volunteer/plan?meetupId=${lead.event.id}&departmentId=${lead.department.id}`}>
                  <Button size="sm">Edit Plan</Button>
                </Link>
              ) : null
            }
          />
          <CardBody className="space-y-3 text-sm">
            {lead.event ? (
              <>
                <p>
                  <span className="font-medium">Date:</span> {formatDate(lead.event.meetupDate)}
                </p>
                <p>
                  <span className="font-medium">Time:</span>{" "}
                  {lead.event.startTime && lead.event.endTime
                    ? `${formatTime12h(lead.event.startTime)} – ${formatTime12h(lead.event.endTime)}`
                    : "—"}
                </p>
                <p>
                  <span className="font-medium">Venue:</span> {lead.event.location}
                </p>
                <p>
                  <span className="font-medium">Expected attendance:</span>{" "}
                  {lead.event.expectedAttendance ?? "—"}
                </p>
                {lead.plan ? <Badge>{departmentPlanStatusLabel(lead.plan.status)}</Badge> : <Badge>No plan yet</Badge>}
              </>
            ) : (
              <p className="text-slate-500">There is no upcoming event to plan.</p>
            )}
            {lead.summary.needed > 0 ? (
              <div className="space-y-3">
                {lead.summary.tasks.map((task) => (
                  <div key={task.id} id={`requirement-${task.id}`} className="rounded-md border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">Task: {task.task}</p>
                      <Badge>
                        {staffingRequirementBadge(lead.plan?.status ?? task.status, task.needed, task.confirmed)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-slate-700">
                      Needed: {task.needed} · Confirmed: {task.confirmed} · Still Needed: {task.remaining}
                    </p>
                    {task.volunteers.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-slate-600">
                        {task.volunteers.map((person) => (
                          <li key={person.id}>
                            {person.name}
                            {person.phone ? ` · ${person.phone}` : ""}
                            {` · ${person.availability === "PARTIAL" ? "Partially available" : person.availability === "NOT_AVAILABLE" ? "Not available" : "Available"}`}
                            {` · ${person.assignmentStatus}`}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-slate-500">No confirmed volunteers yet.</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a href={`#requirement-${task.id}`} className="text-sm font-medium text-teal-800">
                        View Volunteers
                      </a>
                      {lead.event && lead.canEditPlan !== false ? (
                        <Link
                          href={`/volunteer/plan?meetupId=${lead.event.id}&departmentId=${lead.department.id}`}
                          className="text-sm font-medium text-teal-800"
                        >
                          Edit Requirement
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {lead.transport ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <p>Total ride requests: {lead.transport.total}</p>
                <p>Assigned: {lead.transport.assigned}</p>
                <p>Unassigned: {lead.transport.unassigned}</p>
                <p>Pickup areas: {lead.transport.pickupAreas.join(", ") || "—"}</p>
                <p className="sm:col-span-2">
                  Available drivers:{" "}
                  {lead.transport.drivers.map((driver) => `${driver.name}${driver.phone ? ` · ${driver.phone}` : ""}`).join("; ") || "—"}
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ))}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="My departments" />
          <CardBody className="space-y-4 text-sm">
            {data.memberships.length === 0 ? (
              <p className="text-slate-500">No department assigned yet.</p>
            ) : (
              <>
                {leadMemberships.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Departments you lead</p>
                    {leadMemberships.map((row) => (
                      <p key={row.id}>
                        {departmentLabel(row.department.code)}{" "}
                        <Badge>Department lead</Badge>
                      </p>
                    ))}
                  </div>
                ) : null}
                {teamMemberships.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Teams you volunteer with</p>
                    {teamMemberships.map((row) => (
                      <p key={row.id}>{departmentLabel(row.department.code)}</p>
                    ))}
                  </div>
                ) : null}
              </>
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
                    {formatDate(event.meetupDate)}
                    {event.startTime ? ` · ${formatTime12h(event.startTime)}` : ""} · {event.location}
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
                {row.request.task} · {row.request.meetup.title} · {formatDate(row.request.requestDate)} ·{" "}
                {formatTime12h(row.request.startTime)}–{formatTime12h(row.request.endTime)}
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
              <div key={request.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <p className="font-medium">{request.task}</p>
                <p className="text-slate-500">
                  {request.meetup.title} · {departmentLabel(request.department.code)} · Remaining spots{" "}
                  {request.remaining} · {formatDate(request.requestDate)} · {formatTime12h(request.startTime)}–
                  {formatTime12h(request.endTime)}
                </p>
                {request.notes ? <p className="mt-1">{request.notes}</p> : null}
                <StaffingResponseForm requestId={request.id} />
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
