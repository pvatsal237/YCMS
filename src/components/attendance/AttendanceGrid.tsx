"use client";

import { useMemo, useState, useTransition } from "react";
import { saveAttendanceAction } from "@/actions/attendance";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import type { AttendanceStatus } from "@prisma/client";

type MemberRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export function AttendanceGrid({
  meetupId,
  members,
  initialMarks,
}: {
  meetupId: string;
  members: MemberRow[];
  initialMarks: Record<string, AttendanceStatus>;
}) {
  const [query, setQuery] = useState("");
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(initialMarks);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) =>
      `${member.firstName} ${member.lastName} ${member.phone}`.toLowerCase().includes(term),
    );
  }, [members, query]);

  function setAll(status: AttendanceStatus) {
    const next: Record<string, AttendanceStatus> = {};
    for (const member of members) next[member.id] = status;
    setMarks(next);
  }

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const payload = members.map((member) => ({
        memberId: member.id,
        status: marks[member.id] ?? "ABSENT",
      }));
      const result = await saveAttendanceAction(meetupId, payload);
      if (result.ok) {
        setMessage(result.message ?? "Attendance saved.");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search members by name"
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setAll("PRESENT")}>
            Mark all present
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAll("ABSENT")}>
            Mark all absent
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving..." : "Save attendance"}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Member</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3">Present</th>
              <th className="px-4 py-3">Absent</th>
              <th className="px-4 py-3">Excused</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((member) => {
              const status = marks[member.id] ?? "ABSENT";
              return (
                <tr key={member.id}>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {member.firstName} {member.lastName}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{member.phone}</td>
                  {(["PRESENT", "ABSENT", "EXCUSED"] as const).map((value) => (
                    <td key={value} className="px-4 py-2 text-center">
                      <input
                        type="radio"
                        name={`status-${member.id}`}
                        checked={status === value}
                        onChange={() => setMarks((current) => ({ ...current, [member.id]: value }))}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
