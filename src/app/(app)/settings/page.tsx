import { requireRole } from "@/lib/session";
import { getSettings } from "@/services/settings";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  await requireRole(["ADMIN"]);
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title="System settings"
        description="Administrator-only configuration. Immigration alert rules are calculated dynamically and are not stored."
      />
      <Card>
        <CardHeader title="Organization" />
        <CardBody>
          <SettingsForm
            organizationName={settings.organizationName}
            defaultMeetupLocation={settings.defaultMeetupLocation}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Immigration alert rules" />
        <CardBody className="space-y-2 text-sm text-slate-700">
          <p>More than 365 days remaining: Valid (green)</p>
          <p>181–365 days: Expiring within 12 months (yellow)</p>
          <p>91–180 days: Expiring within 6 months (orange)</p>
          <p>0–90 days: Expiring within 3 months (red)</p>
          <p>Past expiry date: Expired</p>
        </CardBody>
      </Card>
    </div>
  );
}
