import Link from "next/link";
import { requireRole } from "@/lib/session";
import { listMembers, listFilterOptions } from "@/services/members";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { formatDate } from "@/lib/dates";
import {
  educationSummary,
  employmentSummary,
  fullName,
  immigrationStatusLabel,
} from "@/utils/format";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole(["ADMIN", "COORDINATOR"]);
  const params = await searchParams;
  const [{ members, page, pageCount, total }, options] = await Promise.all([
    listMembers({
      q: params.q,
      immigrationStatus: params.immigrationStatus,
      college: params.college,
      employer: params.employer,
      active: params.active,
      attendanceStatus: params.attendanceStatus,
      permitExpiryFrom: params.permitExpiryFrom,
      permitExpiryTo: params.permitExpiryTo,
      sort: params.sort,
      page: Number(params.page ?? "1"),
    }),
    listFilterOptions(),
  ]);

  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
    ),
  );

  return (
    <div>
      <PageHeader
        title="Members"
        description={`${total} matching records`}
        action={
          <Link href="/members/new">
            <Button>Register member</Button>
          </Link>
        }
      />
      <Card className="mb-4 p-4">
        <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Search name, phone, email, college, employer"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
          <select name="immigrationStatus" defaultValue={params.immigrationStatus ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All immigration statuses</option>
            <option value="STUDENT">Student</option>
            <option value="WORKER">Worker</option>
            <option value="PERMANENT_RESIDENT">Permanent Resident</option>
            <option value="CITIZEN">Citizen</option>
            <option value="VISITOR">Visitor</option>
            <option value="OTHER">Other</option>
          </select>
          <select name="college" defaultValue={params.college ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All colleges</option>
            {options.colleges.map((college) => (
              <option key={college} value={college}>
                {college}
              </option>
            ))}
          </select>
          <select name="employer" defaultValue={params.employer ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All employers</option>
            {options.employers.map((employer) => (
              <option key={employer} value={employer}>
                {employer}
              </option>
            ))}
          </select>
          <select name="active" defaultValue={params.active ?? "active"} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
          <select name="attendanceStatus" defaultValue={params.attendanceStatus ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Attendance filter</option>
            <option value="frequently_absent">Has absences</option>
          </select>
          <input type="date" name="permitExpiryFrom" defaultValue={params.permitExpiryFrom} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input type="date" name="permitExpiryTo" defaultValue={params.permitExpiryTo} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select name="sort" defaultValue={params.sort ?? "joined_desc"} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="joined_desc">Newest joined</option>
            <option value="joined_asc">Oldest joined</option>
            <option value="name">Name</option>
          </select>
          <Button type="submit" variant="secondary">
            Apply filters
          </Button>
        </form>
      </Card>
      <Card>
        {members.length === 0 ? (
          <EmptyState title="No members found" description="Try a different search or register a new member." />
        ) : (
          <Table
            headers={[
              "Name",
              "Phone",
              "Email",
              "Immigration status",
              "Education / employment",
              "Date joined",
              "Status",
              "Actions",
            ]}
          >
            {members.map((member) => (
              <tr key={member.id}>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/members/${member.id}`} className="text-teal-800">
                    {fullName(member)}
                  </Link>
                </td>
                <td className="px-4 py-3">{member.phone}</td>
                <td className="px-4 py-3">{member.email}</td>
                <td className="px-4 py-3">
                  {member.immigrationStatus
                    ? immigrationStatusLabel(member.immigrationStatus.status)
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {educationSummary(member.education)}
                  <div className="text-xs text-slate-500">
                    {employmentSummary(member.employment)}
                  </div>
                </td>
                <td className="px-4 py-3">{formatDate(member.dateJoined)}</td>
                <td className="px-4 py-3">
                  <Badge tone={member.active ? "green" : "slate"}>
                    {member.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/members/${member.id}/edit`} className="text-sm text-teal-700">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} of {pageCount}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/members?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page - 1) })}`}
              className="rounded border border-slate-300 px-3 py-1"
            >
              Previous
            </Link>
          ) : null}
          {page < pageCount ? (
            <Link
              href={`/members?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page + 1) })}`}
              className="rounded border border-slate-300 px-3 py-1"
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
