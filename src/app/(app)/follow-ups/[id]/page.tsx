import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getFollowUp, listAssignableCoordinators } from "@/services/follow-ups";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { FollowUpForm } from "@/components/follow-ups/FollowUpForm";
import { formatDate } from "@/lib/dates";
import { fullName } from "@/utils/format";
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
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader title="Update" />
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
  );
}
