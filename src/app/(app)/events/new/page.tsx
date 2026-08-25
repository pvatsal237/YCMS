import { EventForm } from "@/components/events/EventForm";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { nextSundayDate, defaultDeadline } from "@/services/events";
import { toDateInputValue } from "@/lib/dates";

export default function NewEventPage() {
  const sunday = nextSundayDate();
  const deadline = defaultDeadline(sunday);
  const pad = (n: number) => String(n).padStart(2, "0");
  const deadlineLocal = `${deadline.getFullYear()}-${pad(deadline.getMonth() + 1)}-${pad(deadline.getDate())}T${pad(deadline.getHours())}:${pad(deadline.getMinutes())}`;
  return (
    <div>
      <PageHeader title="Create event" description="Published events are emailed to members." />
      <Card>
        <CardBody>
          <EventForm
            submitLabel="Create draft"
            defaults={{
              eventDate: toDateInputValue(sunday),
              startTime: "09:00",
              endTime: "12:00",
              location: "Community Hall",
              capacity: 80,
              walkInCapacity: 10,
              checkInOpensAt: "08:00",
              registrationDeadline: deadlineLocal,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
