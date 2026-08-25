import { requireMemberSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { updateProfileAction } from "@/actions/members";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default async function ProfilePage() {
  const user = await requireMemberSession();
  const member = await prisma.member.findUniqueOrThrow({ where: { id: user.memberId! } });
  return (
    <div>
      <PageHeader title="Profile" description="Your name and email come from Google and cannot be edited here." />
      <Card>
        <CardBody>
          <div className="mb-4 text-sm text-stone-600">
            <p><span className="text-stone-500">Name</span> {member.firstName} {member.lastName}</p>
            <p><span className="text-stone-500">Email</span> {member.email}</p>
          </div>
          <form action={async (formData) => { "use server"; await updateProfileAction({ ok: true }, formData); }} className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone number">
              <Input name="phone" defaultValue={member.phone ?? ""} />
            </Field>
            <Field label="Emergency contact name">
              <Input name="emergencyName" defaultValue={member.emergencyName ?? ""} />
            </Field>
            <Field label="Emergency contact phone">
              <Input name="emergencyPhone" defaultValue={member.emergencyPhone ?? ""} />
            </Field>
            <Field label="Relationship">
              <Input name="emergencyRelation" defaultValue={member.emergencyRelation ?? ""} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
