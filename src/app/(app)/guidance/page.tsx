import Link from "next/link";
import { requireCoordinator } from "@/lib/session";
import { listGuidanceForCoordinator } from "@/services/guidance";
import { claimGuidanceAction } from "@/actions/guidance";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fullName, guidanceStatusLabel, GUIDANCE_LABELS } from "@/utils/format";

export default async function GuidancePage() {
  await requireCoordinator();
  const rows = await listGuidanceForCoordinator();
  const unclaimed = rows.filter((row) => row.status === "NEW");
  const mine = rows.filter((row) => row.status !== "NEW");
  return (
    <div className="space-y-6">
      <PageHeader title="Guidance" description="Claim a request to become the owner. There is no auto-assignment." />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Unclaimed</h2>
        {unclaimed.length === 0 ? <p className="text-sm text-slate-500">No new requests.</p> : unclaimed.map((row) => (
          <Card key={row.id}>
            <CardBody className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{fullName(row.member)} · {GUIDANCE_LABELS[row.category]}</p>
                <p className="text-sm text-slate-600">{row.message}</p>
              </div>
              <form action={claimGuidanceAction}>
                <input type="hidden" name="id" value={row.id} />
                <Button type="submit" size="sm">Claim Request</Button>
              </form>
            </CardBody>
          </Card>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Claimed and later</h2>
        {mine.map((row) => (
          <Card key={row.id}>
            <CardBody className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{fullName(row.member)} · {GUIDANCE_LABELS[row.category]}</p>
                <p className="text-sm text-slate-500">Owner: {row.claimedBy?.name ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{guidanceStatusLabel(row.status)}</Badge>
                <Link href={`/guidance/${row.id}`} className="text-sm font-medium text-teal-800">Open</Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </section>
    </div>
  );
}
