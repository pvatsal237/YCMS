import { notFound } from "next/navigation";
import { requireCoordinator } from "@/lib/session";
import { getEvent } from "@/services/events";
import { checkInAction } from "@/actions/registration";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fullName } from "@/utils/format";

export default async function CheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  await requireCoordinator();
  const { id } = await params;
  const { q } = await searchParams;
  const event = await getEvent(id);
  if (!event) notFound();
  const query = (q ?? "").trim().toLowerCase();
  const rows = event.registrations.filter((row) => {
    if (row.status !== "REGISTERED") return false;
    if (!query) return true;
    const hay = `${row.member.firstName} ${row.member.lastName} ${row.member.email}`.toLowerCase();
    return hay.includes(query);
  });

  return (
    <div className="space-y-6">
      <PageHeader title={`Check-in · ${event.title}`} description="Search quickly, then check in. Duplicate check-in is blocked." />
      <form className="max-w-md">
        <input name="q" defaultValue={q} placeholder="Search name or email" className="w-full rounded-md border px-3 py-2 text-sm" />
      </form>
      <div className="space-y-2">
        {rows.map((row) => (
          <Card key={row.id}>
            <CardBody className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{fullName(row.member)}</p>
                <p className="text-sm text-slate-500">{row.member.email}{row.type === "WALK_IN" ? " · Walk-in" : ""}</p>
              </div>
              {row.checkInStatus === "CHECKED_IN" ? (
                <p className="text-sm text-emerald-700">Checked in</p>
              ) : (
                <form action={checkInAction}>
                  <input type="hidden" name="registrationId" value={row.id} />
                  <Button type="submit" size="sm">Check In</Button>
                </form>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
