import { z } from "zod";

export const assistanceCategories = [
  "IMMIGRATION_DOCUMENT",
  "EDUCATION",
  "EMPLOYMENT",
  "ACCOMMODATION",
  "MEETUP",
  "PERSONAL",
  "OTHER",
] as const;

export const assistancePriorities = ["LOW", "MEDIUM", "HIGH"] as const;
export const assistanceStatuses = [
  "NEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_MEMBER",
  "RESOLVED",
  "CLOSED",
] as const;
export const assistanceRoles = ["COORDINATOR", "ADMIN"] as const;

export const createAssistanceRequestSchema = z.object({
  category: z.enum(assistanceCategories),
  documentId: z.string().optional(),
  requestedRole: z.enum(assistanceRoles),
  requestedUserId: z.string().optional(),
  urgency: z.enum(assistancePriorities),
  impact: z.enum(assistancePriorities),
  preferredResponseBy: z.string().optional(),
  memberNote: z.string().optional(),
});

export const updateAssistanceRequestSchema = z.object({
  id: z.string().min(1),
  status: z.enum(assistanceStatuses),
  assignedToId: z.string().optional(),
  internalNote: z.string().optional(),
});

export type CreateAssistanceRequestInput = z.infer<typeof createAssistanceRequestSchema>;
export type UpdateAssistanceRequestInput = z.infer<typeof updateAssistanceRequestSchema>;
