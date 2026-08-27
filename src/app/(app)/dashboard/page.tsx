import { requireCoordinator } from "@/lib/session";
import { dashboardStats } from "@/services/reports";
import { getCoordinatorFeaturedEvent } from "@/services/events";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { FeaturedEventCard } from "@/components/events/FeaturedEventCard";
import { loadPageData } from "@/lib/page-data";
import { PageLoadError } from "@/components/ui/PageLoadError";

export default async function DashboardPage() {
  await requireCoordinator();
  const loaded = await loadPageData("dashboard.page", async () => {
    const [stats, featured] = await Promise.all([dashboardStats(), getCoordinatorFeaturedEvent()]);
    return { stats, featured };
  });
  if (!loaded.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="A simple snapshot of IYCM activity." />
        <PageLoadError description="We could not load the dashboard. Please try again." />
      </div>
    );
  }

  const { stats, featured } = loaded.data;
  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="A simple snapshot of IYCM activity." />
      {featured ? (
        <FeaturedEventCard event={featured} registeredCount={featured._count.registrations} />
      ) : (
        <Card>
          <EmptyState title="No upcoming events." description="Published events will appear here when their date is upcoming." />
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">Active members</p>
            <p className="mt-2 text-3xl font-semibold">{stats.members}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">Published events</p>
            <p className="mt-2 text-3xl font-semibold">{stats.published}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">Unclaimed guidance</p>
            <p className="mt-2 text-3xl font-semibold">{stats.openGuidance}</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
