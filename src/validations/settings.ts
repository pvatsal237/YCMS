import { z } from "zod";

export const settingsSchema = z.object({
  organizationName: z.string().trim().min(1, "Organization name is required."),
  defaultMeetupLocation: z.string().trim().min(1, "Default location is required."),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
