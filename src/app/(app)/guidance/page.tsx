import Link from "next/link";
import { listGuidanceRequests } from "@/services/guidance";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { fullName, guidanceCategoryLabel, guidanceStatusLabel } from "@/utils/format";
import { maskPhone } from "@/lib/privacy";
import { formatDateTime } from "@/lib/dates";
import type { GuidanceStatus } from "@prisma/client";

const GROUPS: Array<{ status: GuidanceStatus; title: string }> = [
  { status: "NEW", title: "New / Unclaimed" },
  { status: "CLAIMED", title: "Claimed" },
  { status: "WAITING_FOR_MEMBER", title: "Waiting for member" },
  { status: "RESOLVED", title: "Resolved" },
];

export default async function GuidanceQueuePage() {
  const rows = await listGuidanceRequests();
  return (
    <div className="space-y-6">
      <PageHeader title="Guidance" description="Claim requests that match your expertise." />
      {GROUPS.map((group) => {
        const items = rows.filter((row) => row.status === group.status);
        return (
          <Card key={group.status}>
            <CardHeader title={`${group.title} (${items.length})`} />
            <CardBody className="space-y-3">
              {items.map((row) => (
                <Link key={row.id} href={`/guidance/${row.id}`} className="block rounded-md border border-stone-100 px-3 py-2 hover:bg-stone-50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{fullName(row.member)}</span>
                    <span className="text-xs text-stone-500">{guidanceStatusLabel(row.status)}</span>
                  </div>
                  <p className="text-sm text-stone-600">{guidanceCategoryLabel(row.category)} · {row.member.email} · {maskPhone(row.member.phone)}</p>
                  <p className="text-sm text-stone-500">{row.message}</p>
                  {row.assignedTo ? <p className="text-xs text-teal-800">Assigned to: {row.assignedTo.name}</p> : null}
                  <p className="text-xs text-stone-400">{formatDateTime(row.createdAt)}</p>
                </Link>
              ))}
              {items.length === 0 ? <p className="text-sm text-stone-500">None.</p> : null}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
