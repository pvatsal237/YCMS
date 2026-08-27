import { requireMemberSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { ProfileForm } from "@/components/members/ProfileForm";

export default async function ProfilePage() {
  const user = await requireMemberSession();
  const member = await prisma.member.findUnique({ where: { id: user.memberId ?? "" } });
  if (!member) notFound();
  return (
    <div>
      <PageHeader title="Profile" description="Email is your login identity." />
      <Card>
        <CardBody>
          <ProfileForm member={member} />
        </CardBody>
      </Card>
    </div>
  );
}
