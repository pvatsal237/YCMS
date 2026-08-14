import { z } from "zod";

export const followUpUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PENDING", "CONTACTED", "COMPLETED", "UNABLE_TO_REACH"]),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
});

export type FollowUpUpdateInput = z.infer<typeof followUpUpdateSchema>;
