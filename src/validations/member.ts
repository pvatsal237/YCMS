import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const educationSchema = z.object({
  country: z.string().trim().min(1, "Education country is required."),
  institution: z.string().trim().min(1, "Institution is required."),
  program: z.string().trim().min(1, "Program is required."),
  fieldOfStudy: z.string().trim().min(1, "Field of study is required."),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().optional(),
  currentlyStudying: z.boolean().default(false),
});

export const memberFormSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required."),
    middleName: optionalString,
    lastName: z.string().trim().min(1, "Last name is required."),
    dateOfBirth: z.string().min(1, "Date of birth is required."),
    gender: z.enum([
      "FEMALE",
      "MALE",
      "NON_BINARY",
      "PREFER_NOT_TO_SAY",
      "OTHER",
    ]),
    phone: z.string().trim().min(7, "Phone number is required."),
    email: z.string().trim().email("Enter a valid email address."),
    bloodGroup: optionalString,
    referredBy: optionalString,
    dateJoined: z.string().min(1, "Date joined is required."),
    canadianAddressLine1: z.string().trim().min(1, "Address line 1 is required."),
    canadianAddressLine2: optionalString,
    canadianCity: z.string().trim().min(1, "City is required."),
    canadianProvince: z.string().trim().min(1, "Province is required."),
    canadianPostalCode: z.string().trim().min(3, "Postal code is required."),
    homeAddressLine1: z.string().trim().min(1, "Home address is required."),
    homeAddressLine2: optionalString,
    homeCity: z.string().trim().min(1, "Home city is required."),
    homeProvince: z.string().trim().min(1, "Home state/province is required."),
    homePostalCode: z.string().trim().min(1, "Home postal code is required."),
    homeCountry: z.string().trim().min(1, "Home country is required."),
    emergencyName: z.string().trim().min(1, "Emergency contact name is required."),
    emergencyRelationship: z.string().trim().min(1, "Relationship is required."),
    emergencyPhone: z.string().trim().min(7, "Emergency phone is required."),
    emergencyAlternatePhone: optionalString,
    education: z.array(educationSchema).default([]),
    immigrationStatus: z.enum([
      "STUDENT",
      "WORKER",
      "PERMANENT_RESIDENT",
      "CITIZEN",
      "VISITOR",
      "OTHER",
    ]),
    college: optionalString,
    program: optionalString,
    studyPermitExpiry: optionalString,
    workPermitType: optionalString,
    workPermitExpiry: optionalString,
    prCardExpiry: optionalString,
    passportNumber: optionalString,
    passportExpiry: optionalString,
    immigrationNotes: optionalString,
    employmentStatus: z.enum([
      "EMPLOYED",
      "UNEMPLOYED",
      "SELF_EMPLOYED",
      "STUDENT",
      "OTHER",
    ]),
    employer: optionalString,
    jobTitle: optionalString,
    fieldRelated: z.boolean().default(false),
    lookingForJob: z.boolean().default(false),
    desiredField: optionalString,
    employmentNotes: optionalString,
    lookingForAccommodation: z.boolean().default(false),
    preferredLocation: optionalString,
    moveInDate: optionalString,
    budget: optionalString,
    accommodationNotes: optionalString,
    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.immigrationStatus === "STUDENT") {
      if (!data.college) {
        ctx.addIssue({
          code: "custom",
          path: ["college"],
          message: "College/university is required for students.",
        });
      }
      if (!data.program) {
        ctx.addIssue({
          code: "custom",
          path: ["program"],
          message: "Program is required for students.",
        });
      }
      if (!data.studyPermitExpiry) {
        ctx.addIssue({
          code: "custom",
          path: ["studyPermitExpiry"],
          message: "Study permit expiry is required for students.",
        });
      }
    }
    if (data.immigrationStatus === "WORKER") {
      if (!data.workPermitType) {
        ctx.addIssue({
          code: "custom",
          path: ["workPermitType"],
          message: "Work permit type is required for workers.",
        });
      }
      if (!data.workPermitExpiry) {
        ctx.addIssue({
          code: "custom",
          path: ["workPermitExpiry"],
          message: "Work permit expiry is required for workers.",
        });
      }
    }
    if (data.immigrationStatus === "PERMANENT_RESIDENT" && !data.prCardExpiry) {
      ctx.addIssue({
        code: "custom",
        path: ["prCardExpiry"],
        message: "PR card expiry is required for permanent residents.",
      });
    }
  });

export type MemberFormInput = z.infer<typeof memberFormSchema>;
