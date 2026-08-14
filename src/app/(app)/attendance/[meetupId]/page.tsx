import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getMeetup, listAttendanceMembers } from "@/services/attendance";
import { PageHeader } from "@/components/ui/Feedback";
import { Card, CardBody } from "@/components/ui/Card";
import { AttendanceGrid } from "@/components/attendance/AttendanceGrid";
import { formatDate } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import type { AttendanceStatus } from "@prisma/client";

export default async function MeetupAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ meetupId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSession();
  const { meetupId } = await params;
  const { q } = await searchParams;
  let meetup;
  try {
    meetup = await getMeetup(meetupId);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  const members = await listAttendanceMembers(q);
  const initialMarks: Record<string, AttendanceStatus> = {};
  for (const row of meetup.attendance) {
    initialMarks[row.memberId] = row.status;
  }

  return (
    <div>
      <PageHeader
        title={meetup.title}
        description={`${formatDate(meetup.meetupDate)} · ${meetup.location}`}
      />
      <Card>
        <CardBody>
          <AttendanceGrid meetupId={meetup.id} members={members} initialMarks={initialMarks} />
        </CardBody>
      </Card>
    </div>
  );
}
