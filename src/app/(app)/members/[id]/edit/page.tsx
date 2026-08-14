import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getMemberById, toFormValues } from "@/services/members";
import { updateMemberAction } from "@/actions/members";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { MemberForm } from "@/components/members/MemberForm";
import { AppError } from "@/lib/errors";
import { fullName } from "@/utils/format";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "COORDINATOR"]);
  const { id } = await params;
  let member;
  try {
    member = await getMemberById(id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }

  const action = updateMemberAction.bind(null, id);

  return (
    <div>
      <PageHeader title={`Edit ${fullName(member)}`} />
      <Card>
        <CardBody>
          <MemberForm action={action} defaults={toFormValues(member)} submitLabel="Save changes" />
        </CardBody>
      </Card>
    </div>
  );
}
