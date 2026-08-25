import { notFound } from "next/navigation";
import { getGuidanceRequest } from "@/services/guidance";
import { requireCoordinator } from "@/lib/session";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { fullName, guidanceCategoryLabel, guidanceStatusLabel } from "@/utils/format";
import { maskPhone } from "@/lib/privacy";
import { claimGuidanceAction, resolveGuidanceAction, sendGuidanceMessageAction } from "@/actions/guidance";

export default async function GuidanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCoordinator();
  const { id } = await params;
  const request = await getGuidanceRequest(id).catch(() => null);
  if (!request) notFound();

  return (
    <div className="space-y-4">
      <PageHeader title={fullName(request.member)} description={`${guidanceCategoryLabel(request.category)} · ${guidanceStatusLabel(request.status)}`} />
      <p className="text-sm text-stone-600">{request.member.email} · {maskPhone(request.member.phone)}</p>
      {request.assignedTo ? <p className="text-sm text-teal-800">Assigned to: {request.assignedTo.name}</p> : null}
      <Card><CardBody><p className="whitespace-pre-wrap text-sm">{request.message}</p></CardBody></Card>
      <div className="flex gap-2">
        {!request.assignedToId ? (
          <form action={async () => { "use server"; await claimGuidanceAction(request.id); }}>
            <Button type="submit">Claim request</Button>
          </form>
        ) : null}
        {request.assignedToId === user.id && request.status !== "RESOLVED" ? (
          <form action={async () => { "use server"; await resolveGuidanceAction(request.id); }}>
            <Button type="submit" variant="secondary">Mark resolved</Button>
          </form>
        ) : null}
      </div>
      <div className="space-y-3">
        {request.messages.map((message) => (
          <div key={message.id} className="rounded-lg bg-stone-100 px-3 py-2 text-sm">
            <p className="text-xs text-stone-500">{message.author.name}</p>
            <p>{message.body}</p>
          </div>
        ))}
      </div>
      {request.status !== "RESOLVED" ? (
        <form action={async (formData) => { "use server"; await sendGuidanceMessageAction(request.id, formData); }} className="space-y-2">
          <Textarea name="body" placeholder="I'm available Tuesday after 6 PM..." />
          <Button type="submit">Send</Button>
        </form>
      ) : null}
    </div>
  );
}
