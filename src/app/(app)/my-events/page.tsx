import { requireMemberSession } from "@/lib/session";
import { listMyRegistrations } from "@/services/registration";
import { cancelEventAction } from "@/actions/registration";
import { feedbackAction } from "@/actions/members";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/dates";
import { checkInLabel, registrationLabel } from "@/utils/format";

export default async function MyEventsPage() {
  const user = await requireMemberSession();
  const rows = await listMyRegistrations(user.memberId!);
  return (
    <div className="space-y-6">
      <PageHeader title="My events" description="Cancel before check-in. After the event you can leave a short rating." />
      {rows.length === 0 ? <p className="text-sm text-slate-500">You have not registered for an event yet.</p> : null}
      {rows.map((row) => (
        <Card key={row.id}>
          <CardBody className="space-y-3">
            <p className="font-medium">{row.event.title}</p>
            <p className="text-sm text-slate-500">{formatDate(row.event.eventDate)} · {registrationLabel(row.status)} · {checkInLabel(row.checkInStatus)}</p>
            {row.status !== "CANCELLED" && row.checkInStatus !== "CHECKED_IN" ? (
              <form action={cancelEventAction}>
                <input type="hidden" name="eventId" value={row.eventId} />
                <Button type="submit" size="sm" variant="secondary">Cancel Registration</Button>
              </form>
            ) : null}
            {row.event.status === "COMPLETED" && row.checkInStatus === "CHECKED_IN" ? (
              <form action={feedbackAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="eventId" value={row.eventId} />
                <select name="rating" className="rounded-md border px-2 py-1 text-sm" defaultValue="5">
                  <option value="5">5</option>
                  <option value="4">4</option>
                  <option value="3">3</option>
                  <option value="2">2</option>
                  <option value="1">1</option>
                </select>
                <input name="comment" placeholder="Short comment" className="rounded-md border px-2 py-1 text-sm" />
                <Button type="submit" size="sm">Send feedback</Button>
              </form>
            ) : null}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
