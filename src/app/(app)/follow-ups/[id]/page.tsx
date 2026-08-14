import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getFollowUp, listAssignableCoordinators } from "@/services/follow-ups";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { FollowUpForm } from "@/components/follow-ups/FollowUpForm";
import { LogFollowUpForm } from "@/components/follow-ups/LogFollowUpForm";
import { formatDate, formatDateTime } from "@/lib/dates";
import { fullName } from "@/utils/format";
import { followUpOutcomeLabel } from "@/utils/follow-up-outcomes";
import { AppError } from "@/lib/errors";
import Link from "next/link";

export default async function FollowUpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "COORDINATOR"]);
  const { id } = await params;
  let followUp;
  try {
    followUp = await getFollowUp(id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  const coordinators = await listAssignableCoordinators();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <PageHeader title="Follow-up" description={followUp.reason} />
        <Card>
          <CardHeader title="Member" />
          <CardBody className="space-y-2 text-sm">
            <p>
              <Link href={`/members/${followUp.member.id}`} className="font-medium text-teal-800">
                {fullName(followUp.member)}
              </Link>
            </p>
            <p>Phone: {followUp.member.phone}</p>
            <p>Email: {followUp.member.email}</p>
            <p>Last attendance: {formatDate(followUp.lastAttendanceDate)}</p>
            <p>Consecutive absences: {followUp.consecutiveAbsences}</p>
            <p>Created: {formatDate(followUp.createdAt)}</p>
            <p>Latest result: {followUpOutcomeLabel(followUp.lastOutcome)}</p>
            {followUp.nextFollowUpAt ? (
              <p>Call back on: {formatDate(followUp.nextFollowUpAt)}</p>
            ) : null}
          </CardBody>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader title="Log this follow-up" />
          <CardBody>
            <LogFollowUpForm id={followUp.id} memberName={fullName(followUp.member)} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Contact history" />
          <CardBody className="space-y-3 text-sm">
            {followUp.attempts.length === 0 ? (
              <p className="text-slate-500">No calls or messages logged yet.</p>
            ) : (
              followUp.attempts.map((attempt) => (
                <div key={attempt.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-medium">{followUpOutcomeLabel(attempt.outcome)}</p>
                  <p className="text-slate-500">
                    {formatDateTime(attempt.createdAt)}
                    {attempt.createdBy?.name ? ` · ${attempt.createdBy.name}` : ""}
                  </p>
                  {attempt.notes ? <p className="mt-1">{attempt.notes}</p> : null}
                  {attempt.nextFollowUpAt ? (
                    <p className="mt-1 text-teal-800">
                      Call back: {formatDate(attempt.nextFollowUpAt)}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Assignment" />
        <CardBody>
          <FollowUpForm
            id={followUp.id}
            status={followUp.status}
            assignedToId={followUp.assignedToId}
            notes={followUp.notes}
            coordinators={coordinators}
          />
        </CardBody>
      </Card>
      </div>
    </div>
  );
}
