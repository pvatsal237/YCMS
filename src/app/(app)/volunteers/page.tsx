import { requireRole } from "@/lib/session";
import { listDepartments, listPendingPlansForReview, listPendingStaffingForReview, listVolunteersForManage } from "@/services/volunteer";
import { listPendingEnrollments } from "@/services/enrollment";
import { ensureVolunteerEnrollmentSchema } from "@/lib/volunteer-enrollment-schema";
import { EnrollmentReviewForm } from "@/components/volunteer/EnrollmentReviewForm";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { departmentLabel } from "@/utils/format";
import { assignVolunteerDepartmentsAction, reviewDepartmentPlanAction, reviewStaffingRequestAction } from "@/actions/volunteer";
import { formatDate } from "@/lib/dates";

export default async function VolunteersPage() {
  const actor = await requireRole(["ADMIN", "COORDINATOR"]);
  await ensureVolunteerEnrollmentSchema();
  const [volunteers, departments, pending, pendingPlans, pendingEnrollments] = await Promise.all([
    listVolunteersForManage(),
    listDepartments(),
    listPendingStaffingForReview(),
    listPendingPlansForReview(),
    listPendingEnrollments(actor),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Volunteers"
        description="Coordinators review serving requests, assign a department, and welcome people as regular volunteers. Separately, you can designate a department lead for a team. Lead designation is not automatic."
      />
      {pendingEnrollments.length > 0 ? (
        <Card>
          <CardHeader title="People who would like to serve" />
          <CardBody className="space-y-3 text-sm">
            {pendingEnrollments.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <p>
                  {row.member.firstName} {row.member.lastName}
                  {row.department ? ` · ${departmentLabel(row.department.code)}` : row.interestKind === "WHEREVER" ? " · wherever needed" : " · not sure where yet"}
                  {row.isNewVolunteer ? " · new to volunteering" : ""}
                  {row.notes ? ` · ${row.notes}` : ""}
                </p>
                <EnrollmentReviewForm
                  id={row.id}
                  departmentId={row.departmentId}
                  departments={departments}
                />
              </div>
            ))}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader title="People who would like to serve" />
          <CardBody>
            <p className="text-sm text-slate-600">
              All serving requests have been reviewed. When a member submits Serve as Volunteer, it will appear here for you to assign a department.
            </p>
          </CardBody>
        </Card>
      )}
      {pendingPlans.length > 0 ? (
        <Card>
          <CardHeader title="Department plans to review" />
          <CardBody className="space-y-3 text-sm">
            {pendingPlans.map((row) => (
              <div key={row.id} className="flex flex-wrap justify-between gap-2 rounded-md border p-3">
                <span>
                  {departmentLabel(row.department.code)} · {row.meetup.title} · {row.staffingRequests.length} requirements
                </span>
                <div className="flex gap-2">
                  <form action={async () => { await reviewDepartmentPlanAction(row.id, "APPROVED"); }}>
                    <Button type="submit" size="sm">Approve</Button>
                  </form>
                  <form action={async () => { await reviewDepartmentPlanAction(row.id, "CHANGES_REQUESTED"); }}>
                    <Button type="submit" size="sm" variant="secondary">Request changes</Button>
                  </form>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}
      {pending.length > 0 ? (
        <Card>
          <CardHeader title="Staffing requests to review" />
          <CardBody className="space-y-3 text-sm">
            {pending.map((row) => (
              <div key={row.id} className="flex flex-wrap justify-between gap-2 rounded-md border p-3">
                <span>
                  {row.task} · {row.neededCount} · {formatDate(row.requestDate)}
                </span>
                <div className="flex gap-2">
                  <form action={async () => { await reviewStaffingRequestAction(row.id, "APPROVED"); }}>
                    <Button type="submit" size="sm">Approve</Button>
                  </form>
                  <form action={async () => { await reviewStaffingRequestAction(row.id, "REJECTED"); }}>
                    <Button type="submit" size="sm" variant="secondary">Reject</Button>
                  </form>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}
      {volunteers.map((volunteer) => (
        <Card key={volunteer.id}>
          <CardHeader
            title={volunteer.name}
            description={`${volunteer.email}${volunteer.phone ? ` · ${volunteer.phone}` : ""}`}
            action={<Badge tone={volunteer.active ? "green" : "slate"}>{volunteer.active ? "Active" : "Inactive"}</Badge>}
          />
          <CardBody>
            <form action={assignVolunteerDepartmentsAction} className="space-y-3 text-sm">
              <input type="hidden" name="userId" value={volunteer.id} />
              <input name="phone" defaultValue={volunteer.phone ?? ""} placeholder="Phone" className="rounded-md border px-3 py-2" />
              <label className="flex items-center gap-2">
                <input type="checkbox" name="active" defaultChecked={volunteer.active} />
                Active
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {departments.map((dept) => {
                  const membership = volunteer.volunteerMemberships.find((row) => row.departmentId === dept.id);
                  return (
                    <label key={dept.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                      <input type="checkbox" name="departmentId" value={dept.id} defaultChecked={Boolean(membership)} />
                      <span>{departmentLabel(dept.code)}</span>
                      <input type="checkbox" name="leadDepartmentId" value={dept.id} defaultChecked={membership?.responsibility === "LEAD"} />
                      <span className="text-xs text-slate-500">Department lead for this department only</span>
                    </label>
                  );
                })}
              </div>
              <Button type="submit" size="sm">Save assignments</Button>
            </form>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
