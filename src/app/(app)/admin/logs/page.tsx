import { requireRole } from "@/lib/session";
import { listActivityLogs } from "@/services/settings";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { formatDateTime } from "@/lib/dates";
import Link from "next/link";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; page?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const { logs, page, pageCount, actions } = await listActivityLogs({
    q: params.q,
    action: params.action,
    page: Number(params.page ?? "1"),
  });

  return (
    <div>
      <PageHeader title="Activity logs" description="Application events. Passwords are never recorded." />
      <Card className="mb-4 p-4">
        <form className="flex flex-col gap-3 sm:flex-row">
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Search message, action, or user"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select name="action" defaultValue={params.action ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            Filter
          </button>
        </form>
      </Card>
      <Card>
        {logs.length === 0 ? (
          <EmptyState title="No log entries" description="Activity will appear as users work in the system." />
        ) : (
          <Table headers={["Timestamp", "User", "Action", "Entity", "Message"]}>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                <td className="px-4 py-3">{log.user?.name ?? "System"}</td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">
                  {log.entityType ?? "—"}
                  {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                </td>
                <td className="px-4 py-3">{log.message}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <div className="mt-4 flex justify-between text-sm text-slate-600">
        <span>
          Page {page} of {pageCount}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={`/admin/logs?page=${page - 1}`} className="rounded border px-3 py-1">
              Previous
            </Link>
          ) : null}
          {page < pageCount ? (
            <Link href={`/admin/logs?page=${page + 1}`} className="rounded border px-3 py-1">
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
