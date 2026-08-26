import Link from "next/link";
import { requireCoordinator } from "@/lib/session";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EventForm } from "@/components/events/EventForm";

export default async function CreateEventPage() {
  await requireCoordinator();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Event"
        description="Draft events stay hidden until you publish them."
        action={
          <Link href="/events">
            <Button size="sm" variant="secondary">Back to events</Button>
          </Link>
        }
      />
      <Card>
        <CardBody>
          <EventForm />
        </CardBody>
      </Card>
    </div>
  );
}
