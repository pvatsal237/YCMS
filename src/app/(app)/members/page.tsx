import Link from "next/link";
import { listMembers } from "@/services/members";
import { PageHeader } from "@/components/ui/Feedback";
import { fullName } from "@/utils/format";
import { maskPhone } from "@/lib/privacy";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const members = await listMembers(q);
  return (
    <div>
      <PageHeader title="Members" description="People who have signed in with Google." />
      <form className="mb-4 max-w-sm">
        <input name="q" defaultValue={q} placeholder="Search name or email" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
      </form>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Phone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {members.map((member) => (
              <tr key={member.id}>
                <td className="px-4 py-2">
                  <Link className="font-medium text-teal-800 hover:underline" href={`/members/${member.id}`}>
                    {fullName(member)}
                  </Link>
                </td>
                <td className="px-4 py-2">{member.email}</td>
                <td className="px-4 py-2">{maskPhone(member.phone)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
