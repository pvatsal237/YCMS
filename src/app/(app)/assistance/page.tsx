import Link from "next/link";
import { requireRole } from "@/lib/session";
import { listAssistanceRequests } from "@/services/assistance";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { formatDate } from "@/lib/dates";
import {
  assistanceCategoryLabel,
  assistanceStatusLabel,
  documentTypeLabel,
  fullName,
  roleLabel,
} from "@/utils/format";
import { getAlertPresentation } from "@/utils/immigration-alerts";
import type { AssistanceCategory, AssistanceStatus, UserRole } from "@prisma/client";
import { cn } from "@/utils/format";

export default async function AssistanceRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole(["ADMIN", "COORDINATOR"]);
  const params = await searchParams;
  const rows = await listAssistanceRequests(user, {
    status: params.status as AssistanceStatus | undefined,
    requestedRole: params.requestedRole as "ADMIN" | "COORDINATOR" | undefined,
    urgency: params.urgency as "LOW" | "MEDIUM" | "HIGH" | undefined,
    category: params.category as AssistanceCategory | undefined,
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Assistance requests"
        description="Member requests for immigration documents or general help."
      />
      <Card className="mb-4 p-4">
        <form className="grid gap-3 md:grid-cols-6">
          <select name="status" defaultValue={params.status ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="NEW">New</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="WAITING_FOR_MEMBER">Waiting for member</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select name="requestedRole" defaultValue={params.requestedRole ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Coordinator or administrator</option>
            <option value="COORDINATOR">Coordinator</option>
            <option value="ADMIN">Administrator</option>
          </select>
          <select name="urgency" defaultValue={params.urgency ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All urgency</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select name="category" defaultValue={params.category ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All categories</option>
            <option value="IMMIGRATION_DOCUMENT">Immigration document</option>
            <option value="EDUCATION">Education</option>
            <option value="EMPLOYMENT">Employment</option>
            <option value="ACCOMMODATION">Accommodation</option>
            <option value="MEETUP">Meetup</option>
            <option value="PERSONAL">Personal / general</option>
            <option value="OTHER">Other</option>
          </select>
          <button type="submit" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            Filter
          </button>
        </form>
      </Card>
      {rows.length === 0 ? (
        <Card>
          <EmptyState title="No assistance requests" description="Requests submitted from the member portal appear here." />
        </Card>
      ) : (
        <Card>
          <Table
            headers={[
              "Member",
              "Category",
              "Requested person/role",
              "Urgency",
              "Impact",
              "Preferred response by",
              "Created",
              "Status",
            ]}
          >
            {rows.map((row) => {
              const overdue =
                row.preferredResponseBy &&
                row.preferredResponseBy.toISOString().slice(0, 10) < today &&
                !["RESOLVED", "CLOSED"].includes(row.status);
              const alert = row.document ? getAlertPresentation(row.document.expiryDate) : null;
              const immigrationUrgent =
                alert && (alert.level === "EXPIRED" || alert.level === "EXPIRING_3_MONTHS");
              return (
                <tr
                  key={row.id}
                  className={cn(
                    row.urgency === "HIGH" && "bg-red-50",
                    overdue && "bg-amber-50",
                    immigrationUrgent && "bg-orange-50",
                  )}
                >
                  <td className="px-4 py-3">
                    <Link href={`/assistance/${row.id}`} className="font-medium text-teal-800">
                      {fullName(row.member)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {assistanceCategoryLabel(row.category)}
                    {row.document ? (
                      <div className="text-xs text-slate-500">
                        {documentTypeLabel(row.document.documentType)}
                        {immigrationUrgent ? ` · ${alert?.label}` : ""}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {row.requestedUser?.name ?? `Any ${roleLabel(row.requestedRole as UserRole)}`}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={row.urgency === "HIGH" ? "red" : row.urgency === "MEDIUM" ? "orange" : "slate"}>
                      {row.urgency}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{row.impact}</td>
                  <td className="px-4 py-3">
                    {formatDate(row.preferredResponseBy)}
                    {overdue ? <Badge tone="orange">Overdue</Badge> : null}
                  </td>
                  <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3">{assistanceStatusLabel(row.status)}</td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}
    </div>
  );
}
