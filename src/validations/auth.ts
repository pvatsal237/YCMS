import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const memberOtpRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export const memberOtpVerifySchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  otp: z.string().trim().min(6, "Enter the 6-digit code.").max(8),
  trustDevice: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
