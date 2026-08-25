import { listCheckInRoster } from "@/services/checkin";
import { getEvent, eventCounts } from "@/services/events";
import { PageHeader } from "@/components/ui/Feedback";
import { CheckInButton } from "@/components/events/CheckInButton";
import { WalkInQr } from "@/components/events/WalkInQr";
import { maskPhone, appUrl } from "@/lib/privacy";
import { fullName } from "@/utils/format";

export default async function CheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  const event = await getEvent(id);
  const roster = await listCheckInRoster(id, q);
  const counts = await eventCounts(id);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Event Check-In"
        description={`${event.title} · Walk-in slots remaining: ${Math.max(0, event.walkInCapacity - counts.walkIns)}`}
      />
      <WalkInQr url={appUrl(`/walk-in/${event.id}?t=${event.walkInToken}`)} />
      <form className="max-w-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search member"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </form>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-2 text-left">Member</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Phone</th>
              <th className="px-4 py-2 text-left">Registration</th>
              <th className="px-4 py-2 text-left">Check-In</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {roster.map((row) => (
              <tr key={row.member.id}>
                <td className="px-4 py-2 font-medium">{fullName(row.member)}</td>
                <td className="px-4 py-2">{row.member.email}</td>
                <td className="px-4 py-2">{maskPhone(row.member.phone)}</td>
                <td className="px-4 py-2">{row.registration.type === "WALK_IN" ? "Walk-In" : "Registered"}</td>
                <td className="px-4 py-2">
                  <CheckInButton
                    eventId={event.id}
                    memberId={row.member.id}
                    already={row.checkIn?.status === "CHECKED_IN"}
                    at={row.checkIn?.checkedInAt}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
