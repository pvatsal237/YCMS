import { z } from "zod";
import { FOLLOW_UP_OUTCOMES } from "@/utils/follow-up-outcomes";

const outcomeValues = FOLLOW_UP_OUTCOMES.map((item) => item.value) as [
  (typeof FOLLOW_UP_OUTCOMES)[number]["value"],
  ...(typeof FOLLOW_UP_OUTCOMES)[number]["value"][],
];

export const followUpUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PENDING", "CONTACTED", "COMPLETED", "UNABLE_TO_REACH"]),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
});

export const logFollowUpSchema = z.object({
  id: z.string().min(1),
  outcome: z.enum(outcomeValues),
  notes: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
});

export type FollowUpUpdateInput = z.infer<typeof followUpUpdateSchema>;
export type LogFollowUpInput = z.infer<typeof logFollowUpSchema>;
