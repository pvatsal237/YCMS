import { requireCoordinator } from "@/lib/session";
import { listMembers, formatPhoneDisplay } from "@/services/members";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AddMemberForm } from "@/components/members/AddMemberForm";
import { fullName } from "@/utils/format";
import Link from "next/link";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireCoordinator();
  const { q } = await searchParams;
  const members = await listMembers(q);
  return (
    <div className="space-y-6">
      <PageHeader title="Members" description="Name, email, phone, and status." />
      <AddMemberForm />
      <form>
        <input name="q" defaultValue={q} placeholder="Search" className="max-w-md rounded-md border px-3 py-2 text-sm" />
      </form>
      <Card>
        {members.length === 0 ? (
          <EmptyState title="No members yet" description="Add a member to see their contact details here." />
        ) : (
          <CardBody className="overflow-x-auto p-0">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium text-slate-900">{fullName(row)}</td>
                    <td className="px-5 py-3 text-slate-700">{row.email}</td>
                    <td className="px-5 py-3 whitespace-nowrap font-medium text-slate-900">
                      {formatPhoneDisplay(row.phone)}
                    </td>
                    <td className="px-5 py-3">{row.active ? "Active" : "Inactive"}</td>
                    <td className="px-5 py-3">
                      <Link href={`/members/${row.id}`}>
                        <Button size="sm" variant="secondary">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
