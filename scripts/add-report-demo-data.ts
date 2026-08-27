import { PrismaClient } from "@prisma/client";

/**
 * Safe, idempotent historical demo data for IYCM reports.
 * Does not delete, reset, or touch the upcoming published event.
 *
 *   npx tsx scripts/add-report-demo-data.ts
 */

const prisma = new PrismaClient();

const LOCATION = "Hall A, The International Centre\n6900 Airport Road\nMississauga, ON L4V 1E8";

const DEMO_MEMBERS = [
  { id: "demomem_01", firstName: "Avery", lastName: "Singh", email: "demo.member.01@example.test", phone: "416-555-0101" },
  { id: "demomem_02", firstName: "Jordan", lastName: "Lee", email: "demo.member.02@example.test", phone: "416-555-0102" },
  { id: "demomem_03", firstName: "Samira", lastName: "Khan", email: "demo.member.03@example.test", phone: "647-555-0103" },
  { id: "demomem_04", firstName: "Noah", lastName: "Bennett", email: "demo.member.04@example.test", phone: "647-555-0104" },
  { id: "demomem_05", firstName: "Priya", lastName: "Desai", email: "demo.member.05@example.test", phone: "905-555-0105" },
  { id: "demomem_06", firstName: "Marcus", lastName: "Okafor", email: "demo.member.06@example.test", phone: "905-555-0106" },
  { id: "demomem_07", firstName: "Elena", lastName: "Rossi", email: "demo.member.07@example.test", phone: "416-555-0107" },
  { id: "demomem_08", firstName: "Kai", lastName: "Nakamura", email: "demo.member.08@example.test", phone: "416-555-0108" },
  { id: "demomem_09", firstName: "Fatima", lastName: "Hassan", email: "demo.member.09@example.test", phone: "647-555-0109" },
  { id: "demomem_10", firstName: "Owen", lastName: "Clarke", email: "demo.member.10@example.test", phone: "647-555-0110" },
  { id: "demomem_11", firstName: "Mia", lastName: "Tremblay", email: "demo.member.11@example.test", phone: "905-555-0111" },
  { id: "demomem_12", firstName: "Hassan", lastName: "Ali", email: "demo.member.12@example.test", phone: "905-555-0112" },
  { id: "demomem_13", firstName: "Grace", lastName: "Park", email: "demo.member.13@example.test", phone: "416-555-0113" },
  { id: "demomem_14", firstName: "Leo", lastName: "Martinez", email: "demo.member.14@example.test", phone: "416-555-0114" },
  { id: "demomem_15", firstName: "Amara", lastName: "Johnson", email: "demo.member.15@example.test", phone: "647-555-0115" },
  { id: "demomem_16", firstName: "Theo", lastName: "Walsh", email: "demo.member.16@example.test", phone: "647-555-0116" },
  { id: "demomem_17", firstName: "Nina", lastName: "Kowalski", email: "demo.member.17@example.test", phone: "905-555-0117" },
  { id: "demomem_18", firstName: "Ibrahim", lastName: "Youssef", email: "demo.member.18@example.test", phone: "905-555-0118" },
  { id: "demomem_19", firstName: "Sofia", lastName: "Reyes", email: "demo.member.19@example.test", phone: "416-555-0119" },
  { id: "demomem_20", firstName: "Daniel", lastName: "Ng", email: "demo.member.20@example.test", phone: "416-555-0120" },
  { id: "demomem_21", firstName: "Hannah", lastName: "Brooks", email: "demo.member.21@example.test", phone: "647-555-0121" },
  { id: "demomem_22", firstName: "Yusuf", lastName: "Rahman", email: "demo.member.22@example.test", phone: "647-555-0122" },
  { id: "demomem_23", firstName: "Chloe", lastName: "Martin", email: "demo.member.23@example.test", phone: "905-555-0123" },
  { id: "demomem_24", firstName: "Ravi", lastName: "Mehta", email: "demo.member.24@example.test", phone: "905-555-0124" },
  { id: "demomem_25", firstName: "Isla", lastName: "Campbell", email: "demo.member.25@example.test", phone: "416-555-0125" },
  { id: "demomem_26", firstName: "Mateo", lastName: "Santos", email: "demo.member.26@example.test", phone: "416-555-0126" },
] as const;

type DemoEventSpec = {
  id: string;
  title: string;
  description: string;
  speakerName: string;
  speakerTitle: string;
  speakerOrganization: string;
  eventDate: Date;
  registrationDeadline: Date;
  checkInOpensAt: Date;
  registered: number;
  checkedIn: number;
  walkIns: number;
};

const DEMO_EVENTS: DemoEventSpec[] = [
  {
    id: "demoevt_career_ready_20260809",
    title: "Career Ready: Resume and Interview Mastery",
    description:
      "A practical career-development session focused on building stronger resumes, preparing for behavioural interviews, communicating professional experience clearly, and improving confidence during the hiring process.",
    speakerName: "Rachel Morgan",
    speakerTitle: "Senior Talent Acquisition Partner",
    speakerOrganization: "RBC",
    eventDate: new Date(Date.UTC(2026, 7, 9)),
    registrationDeadline: new Date("2026-08-07T10:00:00.000Z"),
    checkInOpensAt: new Date("2026-08-09T08:30:00.000Z"),
    registered: 18,
    checkedIn: 15,
    walkIns: 2,
  },
  {
    id: "demoevt_money_matters_20260816",
    title: "Money Matters: Personal Finance for Young Professionals",
    description:
      "An introductory personal-finance session covering budgeting, credit, emergency savings, investing basics, financial planning, and practical money habits for young professionals in Canada.",
    speakerName: "Daniel Foster",
    speakerTitle: "Financial Education Specialist",
    speakerOrganization: "TD Bank",
    eventDate: new Date(Date.UTC(2026, 7, 16)),
    registrationDeadline: new Date("2026-08-14T10:00:00.000Z"),
    checkInOpensAt: new Date("2026-08-16T08:30:00.000Z"),
    registered: 22,
    checkedIn: 19,
    walkIns: 3,
  },
  {
    id: "demoevt_ai_at_work_20260823",
    title: "AI at Work: Practical Tools for the Modern Workplace",
    description:
      "A hands-on introduction to practical artificial intelligence tools for productivity, research, documentation, problem solving, communication, and career development, with discussion about responsible AI use.",
    speakerName: "Sophia Chen",
    speakerTitle: "AI Solutions Consultant",
    speakerOrganization: "Microsoft Canada",
    eventDate: new Date(Date.UTC(2026, 7, 23)),
    registrationDeadline: new Date("2026-08-21T10:00:00.000Z"),
    checkInOpensAt: new Date("2026-08-23T08:30:00.000Z"),
    registered: 26,
    checkedIn: 23,
    walkIns: 4,
  },
];

function eventPayload(spec: DemoEventSpec, createdById: string | null) {
  return {
    title: spec.title,
    description: spec.description,
    speakerName: spec.speakerName,
    speakerTitle: spec.speakerTitle,
    speakerOrganization: spec.speakerOrganization,
    eventDate: spec.eventDate,
    startTime: "10:00",
    endTime: "12:00",
    location: LOCATION,
    capacity: 50,
    walkInCapacity: 10,
    registrationDeadline: spec.registrationDeadline,
    checkInOpensAt: spec.checkInOpensAt,
    status: "COMPLETED" as const,
    createdById,
  };
}

async function ensureDemoMembers() {
  const members = [];
  for (const row of DEMO_MEMBERS) {
    const member = await prisma.member.upsert({
      where: { email: row.email },
      create: {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        active: true,
      },
      update: {
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        active: true,
      },
    });
    members.push(member);
  }
  return members;
}

async function ensureRegistrations(
  spec: DemoEventSpec,
  memberIds: string[],
  coordinatorId: string | null,
) {
  const noShows = spec.registered - spec.checkedIn;
  if (noShows < 0) throw new Error(`Invalid counts for ${spec.title}`);
  for (let index = 0; index < spec.registered; index += 1) {
    const memberId = memberIds[index];
    const isCheckedIn = index < spec.checkedIn;
    const isWalkIn = isCheckedIn && index >= spec.checkedIn - spec.walkIns;
    const checkedInAt = isCheckedIn
      ? new Date(spec.checkInOpensAt.getTime() + (30 + index) * 60 * 1000)
      : null;
    await prisma.eventRegistration.upsert({
      where: { eventId_memberId: { eventId: spec.id, memberId } },
      create: {
        id: `${spec.id}_${memberId}`,
        eventId: spec.id,
        memberId,
        type: isWalkIn ? "WALK_IN" : "STANDARD",
        status: "REGISTERED",
        checkInStatus: isCheckedIn ? "CHECKED_IN" : "NO_SHOW",
        checkedInAt,
        checkedInById: isCheckedIn ? coordinatorId : null,
      },
      update: {
        type: isWalkIn ? "WALK_IN" : "STANDARD",
        status: "REGISTERED",
        checkInStatus: isCheckedIn ? "CHECKED_IN" : "NO_SHOW",
        checkedInAt,
        checkedInById: isCheckedIn ? coordinatorId : null,
        cancelledAt: null,
      },
    });
  }
}

async function main() {
  const coordinator = await prisma.user.findFirst({
    where: { role: "COORDINATOR", active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  const members = await ensureDemoMembers();
  const memberIds = members.map((row) => row.id);

  for (const spec of DEMO_EVENTS) {
    const data = eventPayload(spec, coordinator?.id ?? null);
    await prisma.event.upsert({
      where: { id: spec.id },
      create: { id: spec.id, ...data },
      update: data,
    });
    await ensureRegistrations(spec, memberIds, coordinator?.id ?? null);
    console.log(
      `Upserted ${spec.title}: ${spec.registered} registered, ${spec.checkedIn} checked in, ${spec.registered - spec.checkedIn} no shows, ${spec.walkIns} walk-ins`,
    );
  }

  console.log("Historical report demo data is ready. No tables were deleted.");
  if (coordinator) console.log(`Events attributed to coordinator ${coordinator.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
