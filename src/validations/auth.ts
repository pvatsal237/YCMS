import { z } from "zod";

export const otpRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export const otpVerifySchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});
