import { Prisma, type ImmigrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { PAGE_SIZE } from "@/lib/constants";
import { parseDateOnly } from "@/lib/dates";
import { logActivity } from "@/lib/activity-log";
import type { MemberFormInput } from "@/validations/member";
import type { MemberListFilters } from "@/types";
import type { SessionUser } from "@/types";

const memberInclude = {
  addresses: true,
  emergencyContact: true,
  education: { orderBy: { startDate: "desc" as const } },
  immigrationStatus: true,
  documents: { orderBy: { expiryDate: "asc" as const } },
  employment: true,
  accommodation: true,
} satisfies Prisma.MemberInclude;

export type MemberWithRelations = Prisma.MemberGetPayload<{
  include: typeof memberInclude;
}>;

function documentsFromForm(input: MemberFormInput) {
  const documents: Array<{
    documentType: "STUDY_PERMIT" | "WORK_PERMIT" | "PR_CARD" | "PASSPORT";
    documentNumber?: string;
    expiryDate: Date;
  }> = [];

  if (input.studyPermitExpiry) {
    documents.push({
      documentType: "STUDY_PERMIT",
      expiryDate: parseDateOnly(input.studyPermitExpiry),
    });
  }
  if (input.workPermitExpiry) {
    documents.push({
      documentType: "WORK_PERMIT",
      expiryDate: parseDateOnly(input.workPermitExpiry),
    });
  }
  if (input.prCardExpiry) {
    documents.push({
      documentType: "PR_CARD",
      expiryDate: parseDateOnly(input.prCardExpiry),
    });
  }
  if (input.passportExpiry) {
    documents.push({
      documentType: "PASSPORT",
      documentNumber: input.passportNumber,
      expiryDate: parseDateOnly(input.passportExpiry),
    });
  }
  return documents;
}

function memberWriteData(input: MemberFormInput, createdById?: string) {
  return {
    firstName: input.firstName,
    middleName: input.middleName,
    lastName: input.lastName,
    dateOfBirth: parseDateOnly(input.dateOfBirth),
    gender: input.gender,
    phone: input.phone,
    email: input.email.toLowerCase(),
    bloodGroup: input.bloodGroup,
    referredBy: input.referredBy,
    dateJoined: parseDateOnly(input.dateJoined),
    active: input.active,
    createdById,
    addresses: {
      create: [
        {
          type: "CANADIAN" as const,
          addressLine1: input.canadianAddressLine1,
          addressLine2: input.canadianAddressLine2,
          city: input.canadianCity,
          provinceState: input.canadianProvince,
          postalCode: input.canadianPostalCode,
          country: "Canada",
        },
        {
          type: "HOME_COUNTRY" as const,
          addressLine1: input.homeAddressLine1,
          addressLine2: input.homeAddressLine2,
          city: input.homeCity,
          provinceState: input.homeProvince,
          postalCode: input.homePostalCode,
          country: input.homeCountry,
        },
      ],
    },
    emergencyContact: {
      create: {
        name: input.emergencyName,
        relationship: input.emergencyRelationship,
        phone: input.emergencyPhone,
        alternatePhone: input.emergencyAlternatePhone,
      },
    },
    education: {
      create: input.education.map((item) => ({
        country: item.country,
        institution: item.institution,
        program: item.program,
        fieldOfStudy: item.fieldOfStudy,
        startDate: parseDateOnly(item.startDate),
        endDate: item.endDate ? parseDateOnly(item.endDate) : null,
        currentlyStudying: item.currentlyStudying,
      })),
    },
    immigrationStatus: {
      create: {
        status: input.immigrationStatus,
        college: input.college,
        program: input.program,
        workPermitType: input.workPermitType,
        notes: input.immigrationNotes,
      },
    },
    documents: { create: documentsFromForm(input) },
    employment: {
      create: {
        employmentStatus: input.employmentStatus,
        employer: input.employer,
        jobTitle: input.jobTitle,
        fieldRelated: input.fieldRelated,
        lookingForJob: input.lookingForJob,
        desiredField: input.desiredField,
        notes: input.employmentNotes,
      },
    },
    accommodation: {
      create: {
        looking: input.lookingForAccommodation,
        preferredLocation: input.preferredLocation,
        moveInDate: input.moveInDate ? parseDateOnly(input.moveInDate) : null,
        budget: input.budget,
        notes: input.accommodationNotes,
      },
    },
  };
}

function searchWhere(q?: string): Prisma.MemberWhereInput | undefined {
  if (!q?.trim()) return undefined;
  const term = q.trim();
  const parts = term.split(/\s+/);
  const or: Prisma.MemberWhereInput[] = [
    { firstName: { contains: term, mode: "insensitive" } },
    { lastName: { contains: term, mode: "insensitive" } },
    { email: { contains: term, mode: "insensitive" } },
    { phone: { contains: term } },
    { education: { some: { institution: { contains: term, mode: "insensitive" } } } },
    { education: { some: { program: { contains: term, mode: "insensitive" } } } },
    { employment: { is: { employer: { contains: term, mode: "insensitive" } } } },
  ];
  const statusGuess = term.replaceAll(" ", "_").toUpperCase();
  const statuses: ImmigrationStatus[] = [
    "STUDENT",
    "WORKER",
    "PERMANENT_RESIDENT",
    "CITIZEN",
    "VISITOR",
    "OTHER",
  ];
  if (statuses.includes(statusGuess as ImmigrationStatus)) {
    or.push({
      immigrationStatus: {
        is: { status: { equals: statusGuess as ImmigrationStatus } },
      },
    });
  }
  if (parts.length >= 2) {
    or.push({
      AND: [
        { firstName: { contains: parts[0], mode: "insensitive" } },
        { lastName: { contains: parts.slice(1).join(" "), mode: "insensitive" } },
      ],
    });
  }
  return { OR: or };
}

export async function listMembers(filters: MemberListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const where: Prisma.MemberWhereInput = {};

  const search = searchWhere(filters.q);
  if (search) Object.assign(where, search);

  if (filters.active === "inactive") where.active = false;
  else if (filters.active !== "all") where.active = true;

  if (filters.immigrationStatus) {
    where.immigrationStatus = {
      is: { status: filters.immigrationStatus as ImmigrationStatus },
    };
  }
  if (filters.college) {
    where.OR = [
      ...(Array.isArray(where.OR) ? where.OR : []),
      {
        immigrationStatus: {
          is: { college: { contains: filters.college, mode: "insensitive" } },
        },
      },
      {
        education: {
          some: { institution: { contains: filters.college, mode: "insensitive" } },
        },
      },
    ];
  }
  if (filters.employer) {
    where.employment = {
      is: { employer: { contains: filters.employer, mode: "insensitive" } },
    };
  }
  if (filters.permitExpiryFrom || filters.permitExpiryTo) {
    where.documents = {
      some: {
        documentType: { in: ["STUDY_PERMIT", "WORK_PERMIT", "PR_CARD"] },
        expiryDate: {
          gte: filters.permitExpiryFrom
            ? parseDateOnly(filters.permitExpiryFrom)
            : undefined,
          lte: filters.permitExpiryTo
            ? parseDateOnly(filters.permitExpiryTo)
            : undefined,
        },
      },
    };
  }

  if (filters.attendanceStatus === "frequently_absent") {
    where.attendance = { some: { status: "ABSENT" } };
  }

  const orderBy: Prisma.MemberOrderByWithRelationInput =
    filters.sort === "name"
      ? { lastName: "asc" }
      : filters.sort === "joined_asc"
        ? { dateJoined: "asc" }
        : { dateJoined: "desc" };

  const [total, members] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      include: {
        immigrationStatus: true,
        employment: true,
        education: true,
        attendance: {
          orderBy: { meetup: { meetupDate: "desc" } },
          take: 1,
          include: { meetup: true },
        },
      },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return {
    members,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function searchMembers(query: string, take = 12) {
  const where = searchWhere(query) ?? { id: "none" };
  return prisma.member.findMany({
    where: { AND: [{ active: true }, where] },
    include: {
      immigrationStatus: true,
      employment: true,
      education: true,
    },
    take,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getMemberById(id: string) {
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      ...memberInclude,
      attendance: {
        include: { meetup: true, recordedBy: { select: { name: true } } },
        orderBy: { meetup: { meetupDate: "desc" } },
      },
      followUps: {
        include: { assignedTo: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      createdBy: { select: { name: true } },
    },
  });
  if (!member) {
    throw new AppError("Member not found.", 404, "NOT_FOUND");
  }
  return member;
}

export async function createMember(input: MemberFormInput, actor: SessionUser) {
  try {
    const member = await prisma.member.create({
      data: memberWriteData(input, actor.id),
    });
    const { ensureMemberLoginUser } = await import("@/services/member-auth");
    await ensureMemberLoginUser(member);
    await logActivity({
      userId: actor.id,
      action: "MEMBER_CREATED",
      entityType: "Member",
      entityId: member.id,
      message: `${actor.name} created member ${input.firstName} ${input.lastName}`,
    });
    return member;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("Member with this email already exists.", 409, "DUPLICATE");
    }
    throw error;
  }
}

export async function updateMember(
  id: string,
  input: MemberFormInput,
  actor: SessionUser,
) {
  const existing = await prisma.member.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Member not found.", 404, "NOT_FOUND");
  }

  try {
    const member = await prisma.$transaction(async (tx) => {
      await tx.address.deleteMany({ where: { memberId: id } });
      await tx.education.deleteMany({ where: { memberId: id } });
      await tx.immigrationDocument.deleteMany({ where: { memberId: id } });
      await tx.emergencyContact.deleteMany({ where: { memberId: id } });
      await tx.memberImmigrationStatus.deleteMany({ where: { memberId: id } });
      await tx.employment.deleteMany({ where: { memberId: id } });
      await tx.accommodationNeed.deleteMany({ where: { memberId: id } });

      const data = memberWriteData(input);
      return tx.member.update({
        where: { id },
        data: {
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          phone: data.phone,
          email: data.email,
          bloodGroup: data.bloodGroup,
          referredBy: data.referredBy,
          dateJoined: data.dateJoined,
          active: data.active,
          addresses: data.addresses,
          emergencyContact: data.emergencyContact,
          education: data.education,
          immigrationStatus: data.immigrationStatus,
          documents: data.documents,
          employment: data.employment,
          accommodation: data.accommodation,
        },
      });
    });

    const { ensureMemberLoginUser } = await import("@/services/member-auth");
    await ensureMemberLoginUser(member);

    await logActivity({
      userId: actor.id,
      action: "MEMBER_UPDATED",
      entityType: "Member",
      entityId: id,
      message: `${actor.name} updated member ${input.firstName} ${input.lastName}`,
    });
    return member;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("Member with this email already exists.", 409, "DUPLICATE");
    }
    throw error;
  }
}

export async function deactivateMember(id: string, actor: SessionUser) {
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) {
    throw new AppError("Member not found.", 404, "NOT_FOUND");
  }
  const updated = await prisma.member.update({
    where: { id },
    data: { active: false },
  });
  await prisma.user.updateMany({
    where: { memberId: id, role: "MEMBER" },
    data: { active: false },
  });
  await logActivity({
    userId: actor.id,
    action: "MEMBER_DEACTIVATED",
    entityType: "Member",
    entityId: id,
    message: `${actor.name} deactivated member ${member.firstName} ${member.lastName}`,
  });
  return updated;
}

export async function listFilterOptions() {
  const [colleges, employers] = await Promise.all([
    prisma.memberImmigrationStatus.findMany({
      where: { college: { not: null } },
      distinct: ["college"],
      select: { college: true },
    }),
    prisma.employment.findMany({
      where: { employer: { not: null } },
      distinct: ["employer"],
      select: { employer: true },
    }),
  ]);
  return {
    colleges: colleges.map((item) => item.college).filter(Boolean) as string[],
    employers: employers
      .map((item) => item.employer)
      .filter(Boolean) as string[],
  };
}

export function toFormValues(member: MemberWithRelations): MemberFormInput {
  const canadian = member.addresses.find((item) => item.type === "CANADIAN");
  const home = member.addresses.find((item) => item.type === "HOME_COUNTRY");
  const study = member.documents.find((item) => item.documentType === "STUDY_PERMIT");
  const work = member.documents.find((item) => item.documentType === "WORK_PERMIT");
  const pr = member.documents.find((item) => item.documentType === "PR_CARD");
  const passport = member.documents.find((item) => item.documentType === "PASSPORT");

  return {
    firstName: member.firstName,
    middleName: member.middleName ?? undefined,
    lastName: member.lastName,
    dateOfBirth: member.dateOfBirth.toISOString().slice(0, 10),
    gender: member.gender,
    phone: member.phone,
    email: member.email,
    bloodGroup: member.bloodGroup ?? undefined,
    referredBy: member.referredBy ?? undefined,
    dateJoined: member.dateJoined.toISOString().slice(0, 10),
    canadianAddressLine1: canadian?.addressLine1 ?? "",
    canadianAddressLine2: canadian?.addressLine2 ?? undefined,
    canadianCity: canadian?.city ?? "",
    canadianProvince: canadian?.provinceState ?? "",
    canadianPostalCode: canadian?.postalCode ?? "",
    homeAddressLine1: home?.addressLine1 ?? "",
    homeAddressLine2: home?.addressLine2 ?? undefined,
    homeCity: home?.city ?? "",
    homeProvince: home?.provinceState ?? "",
    homePostalCode: home?.postalCode ?? "",
    homeCountry: home?.country ?? "India",
    emergencyName: member.emergencyContact?.name ?? "",
    emergencyRelationship: member.emergencyContact?.relationship ?? "",
    emergencyPhone: member.emergencyContact?.phone ?? "",
    emergencyAlternatePhone: member.emergencyContact?.alternatePhone ?? undefined,
    education: member.education.map((item) => ({
      country: item.country,
      institution: item.institution,
      program: item.program,
      fieldOfStudy: item.fieldOfStudy,
      startDate: item.startDate.toISOString().slice(0, 10),
      endDate: item.endDate?.toISOString().slice(0, 10),
      currentlyStudying: item.currentlyStudying,
    })),
    immigrationStatus: member.immigrationStatus?.status ?? "OTHER",
    college: member.immigrationStatus?.college ?? undefined,
    program: member.immigrationStatus?.program ?? undefined,
    studyPermitExpiry: study?.expiryDate.toISOString().slice(0, 10),
    workPermitType: member.immigrationStatus?.workPermitType ?? undefined,
    workPermitExpiry: work?.expiryDate.toISOString().slice(0, 10),
    prCardExpiry: pr?.expiryDate.toISOString().slice(0, 10),
    passportNumber: passport?.documentNumber ?? undefined,
    passportExpiry: passport?.expiryDate.toISOString().slice(0, 10),
    immigrationNotes: member.immigrationStatus?.notes ?? undefined,
    employmentStatus: member.employment?.employmentStatus ?? "OTHER",
    employer: member.employment?.employer ?? undefined,
    jobTitle: member.employment?.jobTitle ?? undefined,
    fieldRelated: member.employment?.fieldRelated ?? false,
    lookingForJob: member.employment?.lookingForJob ?? false,
    desiredField: member.employment?.desiredField ?? undefined,
    employmentNotes: member.employment?.notes ?? undefined,
    lookingForAccommodation: member.accommodation?.looking ?? false,
    preferredLocation: member.accommodation?.preferredLocation ?? undefined,
    moveInDate: member.accommodation?.moveInDate?.toISOString().slice(0, 10),
    budget: member.accommodation?.budget ?? undefined,
    accommodationNotes: member.accommodation?.notes ?? undefined,
    active: member.active,
  };
}
