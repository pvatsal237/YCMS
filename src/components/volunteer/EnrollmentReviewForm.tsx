import { reviewEnrollmentFormAction } from "@/actions/enrollment";
import { Button } from "@/components/ui/Button";
import { departmentLabel } from "@/utils/format";
import type { VolunteerDepartmentCode } from "@prisma/client";

export function EnrollmentReviewForm({
  id,
  departmentId,
  departments,
}: {
  id: string;
  departmentId: string | null;
  departments?: Array<{ id: string; code: VolunteerDepartmentCode }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={reviewEnrollmentFormAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="decision" value="APPROVED" />
        {departments ? (
          <select name="departmentId" required defaultValue={departmentId ?? ""} className="rounded-md border px-2 py-1 text-sm">
            <option value="">Assign a department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {departmentLabel(dept.code)}
              </option>
            ))}
          </select>
        ) : null}
        <Button type="submit" size="sm">
          Welcome as regular volunteer
        </Button>
      </form>
      <form action={reviewEnrollmentFormAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="decision" value="REJECTED" />
        <Button type="submit" size="sm" variant="secondary">
          Not this time
        </Button>
      </form>
    </div>
  );
}
