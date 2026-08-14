export type AttendanceStatusValue = "PRESENT" | "ABSENT" | "EXCUSED";

export type AttendanceRecordLike = {
  meetupId: string;
  status: AttendanceStatusValue;
};

export type MeetupLike = {
  id: string;
};

/**
 * Count consecutive absences from the newest meetup backward.
 * EXCUSED records are skipped and do not count as absences.
 * A PRESENT record breaks the streak.
 * A missing record (member not marked) stops the streak.
 */
export function countConsecutiveAbsences(
  meetupsNewestFirst: MeetupLike[],
  attendanceByMeetupId: Record<string, AttendanceRecordLike | undefined>,
): number {
  let count = 0;
  for (const meetup of meetupsNewestFirst) {
    const record = attendanceByMeetupId[meetup.id];
    if (!record) {
      break;
    }
    if (record.status === "EXCUSED") {
      continue;
    }
    if (record.status === "ABSENT") {
      count += 1;
      continue;
    }
    break;
  }
  return count;
}

export function shouldOpenThreeAbsenceFollowUp(
  consecutiveAbsences: number,
  hasOpenFollowUp: boolean,
): boolean {
  return consecutiveAbsences >= 3 && !hasOpenFollowUp;
}

export function hasDuplicateAttendancePairs(
  records: Array<{ meetupId: string; memberId: string }>,
): boolean {
  const seen = new Set<string>();
  for (const record of records) {
    const key = `${record.meetupId}:${record.memberId}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}
