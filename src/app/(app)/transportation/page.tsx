import { requireStaffSession } from "@/lib/session";
import { listEligibleRideDrivers, listRideRequestsForStaff, listUpcomingEvents } from "@/services/events";
import { isTransportationAssignee, isTransportationLead } from "@/services/volunteer";
import { reviewRideAction } from "@/actions/events";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/dates";
import { fullName, rideStatusLabel } from "@/utils/format";
import { AssignRideForm } from "@/components/rides/AssignRideForm";
import { TransportAvailabilityForm } from "@/components/volunteer/TransportAvailabilityForm";
import { ensureVolunteerEnrollmentSchema } from "@/lib/volunteer-enrollment-schema";

export default async function TransportationPage() {
  const user = await requireStaffSession();
  await ensureVolunteerEnrollmentSchema();
  const [lead, upcoming, transportVolunteer] = await Promise.all([
    isTransportationLead(user.id),
    listUpcomingEvents(1),
    isTransportationAssignee(user.id),
  ]);
  const canManage = user.role === "ADMIN" || user.role === "COORDINATOR" || lead;
  if (user.role === "ATTENDANCE_VOLUNTEER" && !transportVolunteer) {
    return (
      <div className="space-y-6">
        <PageHeader title="Transportation" description="This workflow is for the Transportation volunteer team." />
        <Card>
          <CardBody>
            <p className="text-sm text-slate-600">
              Your current teams do not include Transportation. If you also help with rides, a coordinator can welcome you to that team. Members can still request a ride from the member portal.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }
  const rows = await listRideRequestsForStaff(user);
  const nextEvent = upcoming[0];
  const meetupIds = [...new Set(rows.map((row) => row.meetupId))];
  const driverLists = canManage
    ? await Promise.all(meetupIds.map((meetupId) => listEligibleRideDrivers(user, meetupId)))
    : [];
  const driversByMeetup = new Map(meetupIds.map((id, index) => [id, driverLists[index] ?? []]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transportation"
        description="Review member ride requests, approve them, and assign a Transportation volunteer. Members request rides from the member portal, not from this tab."
      />
      {nextEvent && transportVolunteer && user.role === "ATTENDANCE_VOLUNTEER" ? (
        <Card>
          <CardBody>
            <TransportAvailabilityForm meetupId={nextEvent.id} eventTitle={nextEvent.title} />
          </CardBody>
        </Card>
      ) : null}
      {rows.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-600">
              There are no ride requests to review right now. When a member requests a ride from the member portal, it will appear here.
            </p>
          </CardBody>
        </Card>
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <CardBody className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{canManage ? fullName(row.member) : row.meetup.title}</p>
                <Badge>{rideStatusLabel(row.status)}</Badge>
              </div>
              <p>{row.meetup.title} · {formatDate(row.meetup.meetupDate)}</p>
              {canManage ? (
                <>
                  <p>Pickup area: {row.pickupArea}</p>
                  <p>Available after: {row.availableAfter}</p>
                  <p>Passengers: {row.passengerCount}</p>
                  <p>Member phone: {row.member.phone}</p>
                </>
              ) : (
                <>
                  <p>Pickup: {row.pickupArea}</p>
                  <p>Available after: {row.availableAfter}</p>
                  <p>Passengers: {row.passengerCount}</p>
                </>
              )}
              {row.driver ? <p>Assigned driver: {row.driver.name}{row.driver.phone ? ` · ${row.driver.phone}` : ""}</p> : null}
              {row.note && canManage ? <p>Note: {row.note}</p> : null}
              {canManage ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {row.status === "REQUESTED" ? (
                    <>
                      <form action={async () => { await reviewRideAction(row.id, "APPROVED"); }}>
                        <Button type="submit" size="sm">Approve</Button>
                      </form>
                      <form action={async () => { await reviewRideAction(row.id, "REJECTED"); }}>
                        <Button type="submit" size="sm" variant="secondary">Reject</Button>
                      </form>
                    </>
                  ) : null}
                  {(row.status === "APPROVED" || row.status === "ASSIGNED") ? (
                    <AssignRideForm
                      rideId={row.id}
                      drivers={driversByMeetup.get(row.meetupId) ?? []}
                    />
                  ) : null}
                </div>
              ) : null}
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
}
