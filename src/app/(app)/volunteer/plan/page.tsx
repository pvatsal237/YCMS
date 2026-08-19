import { requireRole } from "@/lib/session";
import { getPlanEditorData } from "@/services/volunteer";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { DepartmentPlanForm } from "@/components/volunteer/DepartmentPlanForm";
import { departmentLabel, departmentPlanStatusLabel } from "@/utils/format";
import { formatDate, toDateInputValue } from "@/lib/dates";

export default async function VolunteerPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ meetupId?: string; departmentId?: string }>;
}) {
  const user = await requireRole(["ADMIN", "COORDINATOR", "ATTENDANCE_VOLUNTEER"]);
  const params = await searchParams;
  if (!params.meetupId || !params.departmentId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Event planning" description="Open this page from your lead dashboard for a specific event." />
      </div>
    );
  }
  const data = await getPlanEditorData(user.id, params.meetupId, params.departmentId);
  const locked = data.plan?.status === "CLOSED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Plan ${departmentLabel(data.department.code)}`}
        description={`${data.meetup.title} · ${formatDate(data.meetup.meetupDate)}${
          data.plan ? ` · ${departmentPlanStatusLabel(data.plan.status)}` : ""
        }`}
      />
      {data.plan?.reviewNote ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Reviewer note: {data.plan.reviewNote}
        </p>
      ) : null}
      <Card>
        <CardBody>
          <DepartmentPlanForm
            meetupId={data.meetup.id}
            departmentId={data.department.id}
            departmentCode={data.department.code}
            defaultDate={toDateInputValue(data.meetup.meetupDate)}
            eventStart={data.meetup.startTime ?? "20:00"}
            eventEnd={data.meetup.endTime ?? "22:00"}
            volunteers={data.members.filter((row) => row.user.active).map((row) => ({ id: row.user.id, name: row.user.name }))}
            locked={locked}
            initial={{
              cuisine: data.plan?.cuisine,
              sponsorName: data.plan?.sponsorName,
              preparationLocation: data.plan?.preparationLocation,
              kitchenNotes: data.plan?.kitchenNotes,
              knownAssignments: Array.isArray(data.plan?.knownAssignments)
                ? (data.plan.knownAssignments as Array<{ label: string; userId: string }>)
                : [],
              requirements: data.plan?.staffingRequests.map((row) => ({
                id: row.id,
                task: row.task,
                neededCount: String(row.neededCount),
                requestDate: toDateInputValue(row.requestDate),
                startTime: row.startTime,
                endTime: row.endTime,
                notes: row.notes ?? "",
                preAssignedUserId: row.preAssignedUserId ?? "",
              })),
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
