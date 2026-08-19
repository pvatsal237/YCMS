import { requireStaffSession } from "@/lib/session";
import { listRideRequestsForStaff } from "@/services/events";
import { acceptRideAction, reviewRideAction } from "@/actions/events";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/dates";
import { fullName } from "@/utils/format";

export default async function TransportationPage() {
  const user = await requireStaffSession();
  const rows = await listRideRequestsForStaff(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transportation"
        description="Ride requests for upcoming events. If a driver does not answer, members should leave a voicemail with their name and callback number."
      />
      {rows.length === 0 ? (
        <Card><CardBody><p className="text-sm text-slate-500">No ride requests.</p></CardBody></Card>
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <CardBody className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{fullName(row.member)}</p>
                <Badge>{row.status}</Badge>
              </div>
              <p>{row.meetup.title} · {formatDate(row.meetup.meetupDate)}</p>
              <p>Pickup area: {row.pickupArea}</p>
              <p>Available after: {row.availableAfter}</p>
              <p>Passengers: {row.passengerCount}</p>
              <p>Member phone: {row.member.phone}</p>
              {row.driver ? <p>Driver: {row.driver.name} · {row.driver.phone ?? "—"}</p> : null}
              {row.note ? <p>Note: {row.note}</p> : null}
              <div className="flex flex-wrap gap-2 pt-2">
                {row.status === "REQUESTED" && user.role !== "ATTENDANCE_VOLUNTEER" ? (
                  <form action={async () => { await reviewRideAction(row.id, "APPROVED"); }}>
                    <Button type="submit" size="sm">Approve</Button>
                  </form>
                ) : null}
                {row.status === "APPROVED" && !row.driverUserId ? (
                  <form action={async () => { await acceptRideAction(row.id); }}>
                    <Button type="submit" size="sm">Accept ride</Button>
                  </form>
                ) : null}
              </div>
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
}
