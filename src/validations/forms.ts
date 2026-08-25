import { z } from "zod";

export const eventFormSchema = z.object({
  title: z.string().trim().min(3, "Title is required."),
  description: z.string().trim().min(10, "Add a short description."),
  speakerName: z.string().trim().optional(),
  speakerTitle: z.string().trim().optional(),
  speakerOrganization: z.string().trim().optional(),
  eventDate: z.string().min(1, "Date is required."),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().min(1, "End time is required."),
  location: z.string().trim().min(2, "Location is required."),
  capacity: z.coerce.number().int().min(1).max(2000),
  registrationDeadline: z.string().optional(),
  walkInCapacity: z.coerce.number().int().min(0).max(500).default(10),
  checkInOpensAt: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const memberProfileSchema = z.object({
  phone: z.string().trim().optional(),
  emergencyName: z.string().trim().optional(),
  emergencyPhone: z.string().trim().optional(),
  emergencyRelation: z.string().trim().optional(),
});

export const guidanceSchema = z.object({
  category: z.enum([
    "IMMIGRATION",
    "CAREER_DEVELOPMENT",
    "RESUME_INTERVIEW",
    "TECHNOLOGY_IT",
    "AI",
    "FINANCE",
    "ENGINEERING",
    "EDUCATION",
    "ENTREPRENEURSHIP",
    "OTHER",
  ]),
  otherTopic: z.string().trim().optional(),
  message: z.string().trim().min(4, "Tell us briefly how we can help."),
});

export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().optional(),
});
