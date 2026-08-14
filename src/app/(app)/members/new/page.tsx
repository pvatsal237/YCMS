import { requireRole } from "@/lib/session";
import { createMemberAction } from "@/actions/members";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { MemberForm } from "@/components/members/MemberForm";
import { toDateInputValue } from "@/lib/dates";

export default async function NewMemberPage() {
  await requireRole(["ADMIN", "COORDINATOR"]);
  return (
    <div>
      <PageHeader
        title="Register member"
        description="Capture personal, education, immigration, and support information."
      />
      <Card>
        <CardBody>
          <MemberForm
            action={createMemberAction}
            submitLabel="Save member"
            defaults={{
              dateJoined: toDateInputValue(new Date()),
              homeCountry: "India",
              immigrationStatus: "STUDENT",
              employmentStatus: "STUDENT",
              gender: "PREFER_NOT_TO_SAY",
              education: [],
              fieldRelated: false,
              lookingForJob: false,
              lookingForAccommodation: false,
              active: true,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
