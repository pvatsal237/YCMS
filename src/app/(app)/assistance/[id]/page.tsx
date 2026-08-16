import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import {
  getAssistanceRequest,
  listAssignableAssistanceStaff,
} from "@/services/assistance";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AssistanceStaffForm } from "@/components/assistance/AssistanceStaffForm";
import { formatDate, formatDateTime } from "@/lib/dates";
import {
  assistanceCategoryLabel,
  assistanceStatusLabel,
  documentTypeLabel,
  fullName,
  roleLabel,
} from "@/utils/format";
import { getAlertPresentation } from "@/utils/immigration-alerts";
import { AppError } from "@/lib/errors";
import type { UserRole } from "@/types/roles";

export default async function AssistanceRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["ADMIN", "COORDINATOR"]);
  const { id } = await params;
  let request;
  try {
    request = await getAssistanceRequest(id, user);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  const staff = await listAssignableAssistanceStaff(user);
  const alert = request.document ? getAlertPresentation(request.document.expiryDate) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <PageHeader
          title="Assistance request"
          description={assistanceCategoryLabel(request.category)}
        />
        <Card>
          <CardHeader title="Request" />
          <CardBody className="space-y-2 text-sm">
            <p>
              Member:{" "}
              <Link href={`/members/${request.member.id}`} className="font-medium text-teal-800">
                {fullName(request.member)}
              </Link>
            </p>
            <p>Category: {assistanceCategoryLabel(request.category)}</p>
            {request.document && alert ? (
              <p>
                Document: {documentTypeLabel(request.document.documentType)} · expires{" "}
                {formatDate(request.document.expiryDate)} · {alert.label}
              </p>
            ) : null}
            <p>
              Requested: {request.requestedUser?.name ?? `Any ${roleLabel(request.requestedRole as UserRole)}`}
            </p>
            <p>
              Urgency: <Badge tone={request.urgency === "HIGH" ? "red" : "slate"}>{request.urgency}</Badge>
              {" · "}
              Impact: {request.impact}
            </p>
            <p>Preferred response by: {formatDate(request.preferredResponseBy)}</p>
            <p>Status: {assistanceStatusLabel(request.status)}</p>
            <p>Created: {formatDateTime(request.createdAt)}</p>
            {request.resolvedAt ? <p>Resolved: {formatDateTime(request.resolvedAt)}</p> : null}
            <p>Member note: {request.memberNote || "None"}</p>
          </CardBody>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader title="Update" />
          <CardBody>
            <AssistanceStaffForm
              id={request.id}
              status={request.status}
              assignedToId={request.assignedToId}
              staff={staff}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="History" description="Internal notes are visible to staff only." />
          <CardBody className="space-y-3 text-sm">
            {request.updates.length === 0 ? (
              <p className="text-slate-500">No updates yet.</p>
            ) : (
              request.updates.map((item) => (
                <div key={item.id} className="rounded-md border border-slate-200 p-3">
                  <p className="font-medium">
                    {item.status ? assistanceStatusLabel(item.status) : "Note"}
                  </p>
                  <p className="text-slate-500">
                    {formatDateTime(item.createdAt)}
                    {item.createdBy?.name ? ` · ${item.createdBy.name}` : ""}
                  </p>
                  {item.internalNote ? <p className="mt-1">{item.internalNote}</p> : null}
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
