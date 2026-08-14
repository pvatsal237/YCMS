import Link from "next/link";
import { requireRole } from "@/lib/session";
import { listFollowUps } from "@/services/follow-ups";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { formatDate } from "@/lib/dates";
import { fullName, followUpStatusLabel } from "@/utils/format";
import type { FollowUpStatus } from "@prisma/client";

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireRole(["ADMIN", "COORDINATOR"]);
  const params = await searchParams;
  const rows = await listFollowUps({
    status: params.status as FollowUpStatus | undefined,
    q: params.q,
  });

  return (
    <div>
      <PageHeader title="Follow-ups" description="Includes automated three-absence follow-ups." />
      <Card className="mb-4 p-4">
        <form className="flex flex-col gap-3 sm:flex-row">
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Search member or phone"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select name="status" defaultValue={params.status ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONTACTED">Contacted</option>
            <option value="COMPLETED">Completed</option>
            <option value="UNABLE_TO_REACH">Unable to reach</option>
          </select>
          <button type="submit" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            Filter
          </button>
        </form>
      </Card>
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No follow-ups" description="Records appear after three consecutive absences or when created." />
        ) : (
          <Table
            headers={[
              "Member",
              "Phone",
              "Last attendance",
              "Consecutive absences",
              "Assigned coordinator",
              "Status",
              "Created",
              "Actions",
            ]}
          >
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium">{fullName(row.member)}</td>
                <td className="px-4 py-3">{row.member.phone}</td>
                <td className="px-4 py-3">{formatDate(row.lastAttendanceDate)}</td>
                <td className="px-4 py-3">{row.consecutiveAbsences}</td>
                <td className="px-4 py-3">{row.assignedTo?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3">
                  <Badge tone={row.status === "PENDING" ? "orange" : "slate"}>
                    {followUpStatusLabel(row.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-3">
                  <Link href={`/follow-ups/${row.id}`} className="text-sm text-teal-700">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
