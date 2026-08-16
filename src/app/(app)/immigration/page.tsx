import Link from "next/link";
import { requireRole } from "@/lib/session";
import { listImmigrationDocuments } from "@/services/immigration";
import { listPendingDocumentRequests } from "@/services/member-portal";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { formatDate } from "@/lib/dates";
import { documentRequestTypeLabel, documentTypeLabel, fullName } from "@/utils/format";
import { ReviewRenewalButtons } from "@/components/immigration/ReviewRenewalButtons";
import type { AlertLevel } from "@/utils/immigration-alerts";
import type { ImmigrationDocumentType, ImmigrationStatus } from "@prisma/client";

export default async function ImmigrationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole(["ADMIN", "COORDINATOR"]);
  const params = await searchParams;
  const [rows, pending] = await Promise.all([
    listImmigrationDocuments({
      documentType: params.documentType as ImmigrationDocumentType | undefined,
      alertLevel: params.alertLevel as AlertLevel | undefined,
      immigrationStatus: params.immigrationStatus as ImmigrationStatus | undefined,
      expiryFrom: params.expiryFrom,
      expiryTo: params.expiryTo,
    }),
    listPendingDocumentRequests(),
  ]);

  return (
    <div>
      <PageHeader
        title="Immigration tracking"
        description="Alert levels are calculated from expiry dates and are not stored."
      />
      {pending.length > 0 ? (
        <Card className="mb-4">
          <CardHeader
            title="Member renewal requests"
            description="Members reported a renewal request or a new expiry. Approving a renewed date updates the stored expiry."
          />
          <CardBody className="p-0">
            <Table headers={["Member", "Document", "Notice", "Assigned to", "Proposed expiry", ""]}>
              {pending.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <Link href={`/members/${item.memberId}`} className="font-medium text-teal-800">
                      {fullName({ firstName: item.firstName, lastName: item.lastName })}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {item.documentType ? documentTypeLabel(item.documentType) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {item.requestType ? documentRequestTypeLabel(item.requestType) : "—"}
                  </td>
                  <td className="px-4 py-3">{item.assignedToName ?? "—"}</td>
                  <td className="px-4 py-3">{formatDate(item.proposedExpiry)}</td>
                  <td className="px-4 py-3">
                    <ReviewRenewalButtons requestId={item.id} />
                  </td>
                </tr>
              ))}
            </Table>
          </CardBody>
        </Card>
      ) : null}
      <Card className="mb-4 p-4">
        <form className="grid gap-3 md:grid-cols-5">
          <select name="documentType" defaultValue={params.documentType ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All documents</option>
            <option value="STUDY_PERMIT">Study permit</option>
            <option value="WORK_PERMIT">Work permit</option>
            <option value="PR_CARD">PR card</option>
            <option value="PASSPORT">Passport</option>
          </select>
          <select name="alertLevel" defaultValue={params.alertLevel ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All alert levels</option>
            <option value="EXPIRED">Expired</option>
            <option value="EXPIRING_3_MONTHS">Within 3 months</option>
            <option value="EXPIRING_6_MONTHS">Within 6 months</option>
            <option value="EXPIRING_12_MONTHS">Within 12 months</option>
            <option value="VALID">Valid</option>
          </select>
          <select name="immigrationStatus" defaultValue={params.immigrationStatus ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="STUDENT">Student</option>
            <option value="WORKER">Worker</option>
            <option value="PERMANENT_RESIDENT">Permanent Resident</option>
            <option value="CITIZEN">Citizen</option>
            <option value="VISITOR">Visitor</option>
            <option value="OTHER">Other</option>
          </select>
          <input type="date" name="expiryFrom" defaultValue={params.expiryFrom} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input type="date" name="expiryTo" defaultValue={params.expiryTo} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            Filter
          </button>
        </form>
      </Card>
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No documents match" description="Try clearing filters." />
        ) : (
          <Table headers={["Member", "Immigration status", "Document", "Expiry date", "Days remaining", "Alert level"]}>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <Link href={`/members/${row.memberId}`} className="font-medium text-teal-800">
                    {row.memberName}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.immigrationStatusLabel}</td>
                <td className="px-4 py-3">{row.documentLabel}</td>
                <td className="px-4 py-3">{formatDate(row.expiryDate)}</td>
                <td className="px-4 py-3">{row.daysRemaining}</td>
                <td className="px-4 py-3">
                  <Badge tone={row.tone}>{row.label}</Badge>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
