import { requireCoordinator } from "@/lib/session";
import { listMembers, maskPhone } from "@/services/members";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { AddMemberForm } from "@/components/members/AddMemberForm";
import { fullName } from "@/utils/format";
import Link from "next/link";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireCoordinator();
  const { q } = await searchParams;
  const members = await listMembers(q);
  return (
    <div className="space-y-6">
      <PageHeader title="Members" description="Name, email, and masked phone only." />
      <AddMemberForm />
      <form>
        <input name="q" defaultValue={q} placeholder="Search" className="max-w-md rounded-md border px-3 py-2 text-sm" />
      </form>
      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Phone</th>
              </tr>
            </thead>
            <tbody>
              {members.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-5 py-3">
                    <Link href={`/members/${row.id}`} className="font-medium text-teal-800">{fullName(row)}</Link>
                  </td>
                  <td className="px-5 py-3">{row.email}</td>
                  <td className="px-5 py-3">{maskPhone(row.phone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
