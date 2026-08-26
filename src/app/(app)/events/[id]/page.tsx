import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoordinator } from "@/lib/session";
import { getEvent } from "@/services/events";
import { sendReminderAction, setEventStatusAction } from "@/actions/events";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EventForm } from "@/components/events/EventForm";
import { formatDate, formatTime12h } from "@/lib/dates";
import { checkInLabel, eventStatusLabel, fullName, registrationLabel } from "@/utils/format";
import { maskPhone } from "@/services/members";
import { headers } from "next/headers";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCoordinator();
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  const host = (await headers()).get("x-forwarded-host") ?? (await headers()).get("host") ?? "localhost:3000";
  const proto = (await headers()).get("x-forwarded-proto") ?? "http";
  const walkInUrl = `${proto}://${host}/walk-in/${event.id}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(walkInUrl)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.title}
        description={`${formatDate(event.eventDate)} · ${formatTime12h(event.startTime)}–${formatTime12h(event.endTime)} · ${event.location}`}
        action={<Badge>{eventStatusLabel(event.status)}</Badge>}
      />
      <div className="flex flex-wrap gap-2">
        <Link href={`/events/${event.id}/check-in`}><Button size="sm">Event Check-In</Button></Link>
        <form action={sendReminderAction}>
          <input type="hidden" name="id" value={event.id} />
          <Button type="submit" size="sm" variant="secondary">Send reminder</Button>
        </form>
        {event.status !== "COMPLETED" ? (
          <form action={setEventStatusAction}>
            <input type="hidden" name="id" value={event.id} />
            <input type="hidden" name="status" value="COMPLETED" />
            <Button type="submit" size="sm" variant="secondary">Complete event</Button>
          </form>
        ) : null}
      </div>
      <Card>
        <CardHeader title="Walk-in QR" description="Show this on event day. Members never see walk-in capacity." />
        <CardBody className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="Walk-in QR code" width={180} height={180} />
          <p className="text-sm text-slate-600 break-all">{walkInUrl}</p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Participants" />
        <CardBody className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Registration</th>
                <th className="py-2 pr-4">Check-in</th>
                <th className="py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {event.registrations.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4">{fullName(row.member)}</td>
                  <td className="py-2 pr-4">{row.member.email}</td>
                  <td className="py-2 pr-4">{maskPhone(row.member.phone)}</td>
                  <td className="py-2 pr-4">{registrationLabel(row.status)}{row.type === "WALK_IN" ? " · Walk-in" : ""}</td>
                  <td className="py-2 pr-4">{checkInLabel(row.checkInStatus)}</td>
                  <td className="py-2">{row.checkedInAt ? row.checkedInAt.toLocaleTimeString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h2 className="mb-4 text-base font-semibold">Edit event</h2>
          <EventForm event={event} />
        </CardBody>
      </Card>
    </div>
  );
}
