import Link from "next/link";
import { requireRole } from "@/lib/session";
import { listFollowUps } from "@/services/follow-ups";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LogFollowUpForm } from "@/components/follow-ups/LogFollowUpForm";
import { formatDate } from "@/lib/dates";
import { fullName, followUpStatusLabel } from "@/utils/format";
import { followUpOutcomeLabel } from "@/utils/follow-up-outcomes";
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
      <PageHeader
        title="Follow-ups"
        description="Log each call or message: no answer, busy with exams, call back later, and so on."
      />
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
      {rows.length === 0 ? (
        <Card>
          <EmptyState title="No follow-ups" description="Records appear after three consecutive absences or when created." />
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const name = fullName(row.member);
            return (
              <Card key={row.id}>
                <CardBody className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/follow-ups/${row.id}`} className="text-lg font-semibold text-teal-800">
                        {name}
                      </Link>
                      <Badge tone={row.status === "PENDING" ? "orange" : row.status === "COMPLETED" ? "green" : "slate"}>
                        {followUpStatusLabel(row.status)}
                      </Badge>
                    </div>
                    <p>Phone: {row.member.phone}</p>
                    <p>Last attendance: {formatDate(row.lastAttendanceDate)}</p>
                    <p>Consecutive absences: {row.consecutiveAbsences}</p>
                    <p>Assigned: {row.assignedTo?.name ?? "Unassigned"}</p>
                    <p>Latest result: {followUpOutcomeLabel(row.lastOutcome)}</p>
                    {row.nextFollowUpAt ? (
                      <p className="font-medium text-teal-800">
                        Call back on {formatDate(row.nextFollowUpAt)}
                      </p>
                    ) : null}
                    {row.attempts[0]?.notes ? (
                      <p className="text-slate-600">Last note: {row.attempts[0].notes}</p>
                    ) : null}
                    <Link href={`/members/${row.member.id}`} className="text-teal-700">
                      Open member profile
                    </Link>
                  </div>
                  <LogFollowUpForm id={row.id} memberName={name} compact />
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
