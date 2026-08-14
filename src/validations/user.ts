import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  role: z.enum(["COORDINATOR", "ATTENDANCE_VOLUNTEER"]),
  temporaryPassword: z
    .string()
    .min(10, "Temporary password must be at least 10 characters."),
  active: z.boolean().default(true),
});

export const updateUserStatusSchema = z.object({
  id: z.string().min(1),
  active: z.boolean(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
