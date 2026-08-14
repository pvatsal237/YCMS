import { requireRole } from "@/lib/session";
import { getSettings } from "@/services/settings";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { CreateMeetupForm } from "@/components/attendance/CreateMeetupForm";

export default async function NewMeetupPage() {
  await requireRole(["ADMIN", "COORDINATOR"]);
  const settings = await getSettings();
  return (
    <div>
      <PageHeader title="Create meetup" description="Schedule a weekly youth meetup." />
      <Card>
        <CardBody>
          <CreateMeetupForm defaultLocation={settings.defaultMeetupLocation} />
        </CardBody>
      </Card>
    </div>
  );
}
