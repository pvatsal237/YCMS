import { z } from "zod";

export const meetupSchema = z.object({
  meetupDate: z.string().min(1, "Meetup date is required."),
  title: z.string().trim().min(1, "Title is required."),
  location: z.string().trim().min(1, "Location is required."),
});

export const attendanceMarkSchema = z.object({
  meetupId: z.string().min(1),
  marks: z.array(
    z.object({
      memberId: z.string().min(1),
      status: z.enum(["PRESENT", "ABSENT", "EXCUSED"]),
    }),
  ),
});

export type MeetupInput = z.infer<typeof meetupSchema>;
export type AttendanceMarkInput = z.infer<typeof attendanceMarkSchema>;
