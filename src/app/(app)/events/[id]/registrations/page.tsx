import Link from "next/link";
import { getEvent, eventTimeLabel } from "@/services/events";
import { listEventRegistrations } from "@/services/registrations";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/Feedback";
import { maskPhone } from "@/lib/privacy";
import { fullName } from "@/utils/format";
import { formatDateTime } from "@/lib/dates";

export default async function RegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  const rows = await listEventRegistrations(id);
  const checkIns = await prisma.eventCheckIn.findMany({ where: { eventId: id } });
  const byMember = new Map(checkIns.map((row) => [row.memberId, row]));

  return (
    <div>
      <PageHeader title="Registrations" description={`${event.title} · ${eventTimeLabel(event)}`} action={
        <Link className="text-sm text-teal-800" href={`/api/reports/export?type=event&eventId=${event.id}`}>Export CSV</Link>
      } />
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-2 text-left">Member</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Phone</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Check-In</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row) => {
              const check = byMember.get(row.memberId);
              return (
                <tr key={row.id}>
                  <td className="px-4 py-2 font-medium">{fullName(row.member)}</td>
                  <td className="px-4 py-2">{row.member.email}</td>
                  <td className="px-4 py-2">{maskPhone(row.member.phone)}</td>
                  <td className="px-4 py-2">{row.status === "WAITLISTED" ? "Waitlisted" : row.type === "WALK_IN" ? "Walk-In" : "Registered"}</td>
                  <td className="px-4 py-2">
                    {check?.status === "CHECKED_IN"
                      ? `Checked In · ${formatDateTime(check.checkedInAt)}`
                      : check?.status === "NO_SHOW"
                        ? "No Show"
                        : row.status === "REGISTERED"
                          ? "Registered"
                          : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
