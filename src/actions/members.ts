"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRoleAction } from "@/lib/session";
import { memberFormSchema, educationSchema, type MemberFormInput } from "@/validations/member";
import { createMember, updateMember, deactivateMember } from "@/services/members";
import { AppError, logServerError, toUserMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";

function parseMemberForm(formData: FormData) {
  const educationRaw = formData.get("education");
  let education: MemberFormInput["education"] = [];
  if (typeof educationRaw === "string" && educationRaw) {
    const parsed = JSON.parse(educationRaw) as unknown[];
    education = educationSchema.array().parse(
      parsed.filter((item) => {
        return (
          typeof item === "object" &&
          item !== null &&
          "institution" in item &&
          typeof item.institution === "string" &&
          item.institution.trim().length > 0
        );
      }),
    );
  }
  return memberFormSchema.safeParse({
    firstName: formData.get("firstName"),
    middleName: formData.get("middleName") || undefined,
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    gender: formData.get("gender"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    bloodGroup: formData.get("bloodGroup") || undefined,
    referredBy: formData.get("referredBy") || undefined,
    dateJoined: formData.get("dateJoined"),
    canadianAddressLine1: formData.get("canadianAddressLine1"),
    canadianAddressLine2: formData.get("canadianAddressLine2") || undefined,
    canadianCity: formData.get("canadianCity"),
    canadianProvince: formData.get("canadianProvince"),
    canadianPostalCode: formData.get("canadianPostalCode"),
    homeAddressLine1: formData.get("homeAddressLine1"),
    homeAddressLine2: formData.get("homeAddressLine2") || undefined,
    homeCity: formData.get("homeCity"),
    homeProvince: formData.get("homeProvince"),
    homePostalCode: formData.get("homePostalCode"),
    homeCountry: formData.get("homeCountry"),
    emergencyName: formData.get("emergencyName"),
    emergencyRelationship: formData.get("emergencyRelationship"),
    emergencyPhone: formData.get("emergencyPhone"),
    emergencyAlternatePhone: formData.get("emergencyAlternatePhone") || undefined,
    education,
    immigrationStatus: formData.get("immigrationStatus"),
    college: formData.get("college") || undefined,
    program: formData.get("program") || undefined,
    studyPermitExpiry: formData.get("studyPermitExpiry") || undefined,
    workPermitType: formData.get("workPermitType") || undefined,
    workPermitExpiry: formData.get("workPermitExpiry") || undefined,
    prCardExpiry: formData.get("prCardExpiry") || undefined,
    passportNumber: formData.get("passportNumber") || undefined,
    passportExpiry: formData.get("passportExpiry") || undefined,
    immigrationNotes: formData.get("immigrationNotes") || undefined,
    employmentStatus: formData.get("employmentStatus"),
    employer: formData.get("employer") || undefined,
    jobTitle: formData.get("jobTitle") || undefined,
    fieldRelated: formData.get("fieldRelated") === "on",
    lookingForJob: formData.get("lookingForJob") === "on",
    desiredField: formData.get("desiredField") || undefined,
    employmentNotes: formData.get("employmentNotes") || undefined,
    lookingForAccommodation: formData.get("lookingForAccommodation") === "on",
    preferredLocation: formData.get("preferredLocation") || undefined,
    moveInDate: formData.get("moveInDate") || undefined,
    budget: formData.get("budget") || undefined,
    accommodationNotes: formData.get("accommodationNotes") || undefined,
    active: formData.get("active") !== "false",
  });
}

export async function createMemberAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction(["ADMIN", "COORDINATOR"]);
    const parsed = parseMemberForm(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
    }
    const member = await createMember(parsed.data, actor);
    revalidatePath("/members");
    revalidatePath("/dashboard");
    redirect(`/members/${member.id}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, error: error.userMessage };
    }
    if (typeof error === "object" && error && "digest" in error) {
      throw error;
    }
    logServerError("createMemberAction", error);
    return { ok: false, error: "Unable to save member. Please try again." };
  }
}

export async function updateMemberAction(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction(["ADMIN", "COORDINATOR"]);
    if (!id) {
      return { ok: false, error: "Member not found." };
    }
    const parsed = parseMemberForm(formData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
    }
    await updateMember(id, parsed.data, actor);
    revalidatePath("/members");
    revalidatePath(`/members/${id}`);
    redirect(`/members/${id}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, error: error.userMessage };
    }
    if (typeof error === "object" && error && "digest" in error) {
      throw error;
    }
    logServerError("updateMemberAction", error);
    return { ok: false, error: "Unable to save member. Please try again." };
  }
}

export async function deactivateMemberAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRoleAction(["ADMIN", "COORDINATOR"]);
    await deactivateMember(id, actor);
    revalidatePath("/members");
    revalidatePath(`/members/${id}`);
    return { ok: true, message: "Member deactivated." };
  } catch (error) {
    logServerError("deactivateMemberAction", error);
    return { ok: false, error: toUserMessage(error, "Unable to save member. Please try again.") };
  }
}
