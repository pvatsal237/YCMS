import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { WalkInForm } from "@/components/events/WalkInForm";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate } from "@/lib/dates";
import Link from "next/link";

export default async function WalkInPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) notFound();
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?next=/walk-in/${eventId}`);
  }
  if (session.user.role !== "MEMBER") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <PageHeader title="Event-day walk-in" description={event.title} />
      <Card>
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-600">{formatDate(event.eventDate)} · {event.location}</p>
          <WalkInForm eventId={event.id} />
          <p className="text-sm text-slate-500">
            If today is full, your profile stays ready for future events.
          </p>
          <Link href="/home" className="text-sm font-medium text-teal-800">Go to Home</Link>
        </CardBody>
      </Card>
    </div>
  );
}
