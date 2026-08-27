import { PrismaClient } from "@prisma/client";

/**
 * Safe production/demo backfill for IYCM reports.
 * INSERT/UPSERT only. Never deletes, never emails, never touches Mastering AI.
 *
 *   npx tsx scripts/add-production-demo-data.ts
 */

const prisma = new PrismaClient();

const LOCATION = "Hall A, The International Centre\n6900 Airport Road\nMississauga, ON L4V 1E8";
const UPCOMING_TITLE = "Mastering AI: From Everyday Tools to Real-World Impact";

const MEMBERS = [
  { id: "prodmem_01", firstName: "Liam", lastName: "Carter", email: "liam.carter01@example.test", phone: "416-555-0101", emergencyContactName: "Helen Carter", emergencyContactPhone: "416-555-2101" },
  { id: "prodmem_02", firstName: "Emma", lastName: "Thompson", email: "emma.thompson02@example.test", phone: "647-555-0102", emergencyContactName: "Mark Thompson", emergencyContactPhone: "647-555-2102" },
  { id: "prodmem_03", firstName: "Noah", lastName: "Bennett", email: "noah.bennett03@example.test", phone: "905-555-0103", emergencyContactName: "Sarah Bennett", emergencyContactPhone: "905-555-2103" },
  { id: "prodmem_04", firstName: "Olivia", lastName: "Parker", email: "olivia.parker04@example.test", phone: "289-555-0104", emergencyContactName: "James Parker", emergencyContactPhone: "289-555-2104" },
  { id: "prodmem_05", firstName: "Ethan", lastName: "Walker", email: "ethan.walker05@example.test", phone: "437-555-0105", emergencyContactName: "Anna Walker", emergencyContactPhone: "437-555-2105" },
  { id: "prodmem_06", firstName: "Sophia", lastName: "Morgan", email: "sophia.morgan06@example.test", phone: "416-555-0106", emergencyContactName: "David Morgan", emergencyContactPhone: "416-555-2106" },
  { id: "prodmem_07", firstName: "Lucas", lastName: "Anderson", email: "lucas.anderson07@example.test", phone: "647-555-0107", emergencyContactName: "Kate Anderson", emergencyContactPhone: "647-555-2107" },
  { id: "prodmem_08", firstName: "Chloe", lastName: "Foster", email: "chloe.foster08@example.test", phone: "905-555-0108", emergencyContactName: "Brian Foster", emergencyContactPhone: "905-555-2108" },
  { id: "prodmem_09", firstName: "Mason", lastName: "Reed", email: "mason.reed09@example.test", phone: "289-555-0109", emergencyContactName: "Laura Reed", emergencyContactPhone: "289-555-2109" },
  { id: "prodmem_10", firstName: "Emily", lastName: "Collins", email: "emily.collins10@example.test", phone: "437-555-0110", emergencyContactName: "Peter Collins", emergencyContactPhone: "437-555-2110" },
  { id: "prodmem_11", firstName: "Daniel", lastName: "Hughes", email: "daniel.hughes11@example.test", phone: "416-555-0111", emergencyContactName: "Nina Hughes", emergencyContactPhone: "416-555-2111" },
  { id: "prodmem_12", firstName: "Grace", lastName: "Mitchell", email: "grace.mitchell12@example.test", phone: "647-555-0112", emergencyContactName: "Tom Mitchell", emergencyContactPhone: "647-555-2112" },
  { id: "prodmem_13", firstName: "Ryan", lastName: "Cooper", email: "ryan.cooper13@example.test", phone: "905-555-0113", emergencyContactName: "Amy Cooper", emergencyContactPhone: "905-555-2113" },
  { id: "prodmem_14", firstName: "Hannah", lastName: "Brooks", email: "hannah.brooks14@example.test", phone: "289-555-0114", emergencyContactName: "Chris Brooks", emergencyContactPhone: "289-555-2114" },
  { id: "prodmem_15", firstName: "Jacob", lastName: "Turner", email: "jacob.turner15@example.test", phone: "437-555-0115", emergencyContactName: "Megan Turner", emergencyContactPhone: "437-555-2115" },
  { id: "prodmem_16", firstName: "Ava", lastName: "Richardson", email: "ava.richardson16@example.test", phone: "416-555-0116", emergencyContactName: "Paul Richardson", emergencyContactPhone: "416-555-2116" },
  { id: "prodmem_17", firstName: "Benjamin", lastName: "Scott", email: "benjamin.scott17@example.test", phone: "647-555-0117", emergencyContactName: "Rachel Scott", emergencyContactPhone: "647-555-2117" },
  { id: "prodmem_18", firstName: "Lily", lastName: "Evans", email: "lily.evans18@example.test", phone: "905-555-0118", emergencyContactName: "Owen Evans", emergencyContactPhone: "905-555-2118" },
  { id: "prodmem_19", firstName: "Matthew", lastName: "Green", email: "matthew.green19@example.test", phone: "289-555-0119", emergencyContactName: "Clara Green", emergencyContactPhone: "289-555-2119" },
  { id: "prodmem_20", firstName: "Zoe", lastName: "Phillips", email: "zoe.phillips20@example.test", phone: "437-555-0120", emergencyContactName: "Ian Phillips", emergencyContactPhone: "437-555-2120" },
  { id: "prodmem_21", firstName: "Alexander", lastName: "Ross", email: "alexander.ross21@example.test", phone: "416-555-0121", emergencyContactName: "Diana Ross", emergencyContactPhone: "416-555-2121" },
  { id: "prodmem_22", firstName: "Mia", lastName: "Edwards", email: "mia.edwards22@example.test", phone: "647-555-0122", emergencyContactName: "Harry Edwards", emergencyContactPhone: "647-555-2122" },
  { id: "prodmem_23", firstName: "Samuel", lastName: "Wood", email: "samuel.wood23@example.test", phone: "905-555-0123", emergencyContactName: "Jill Wood", emergencyContactPhone: "905-555-2123" },
  { id: "prodmem_24", firstName: "Ella", lastName: "Harris", email: "ella.harris24@example.test", phone: "289-555-0124", emergencyContactName: "Greg Harris", emergencyContactPhone: "289-555-2124" },
  { id: "prodmem_25", firstName: "Nathan", lastName: "Clark", email: "nathan.clark25@example.test", phone: "437-555-0125", emergencyContactName: "Paula Clark", emergencyContactPhone: "437-555-2125" },
  { id: "prodmem_26", firstName: "Natalie", lastName: "Baker", email: "natalie.baker26@example.test", phone: "416-555-0126", emergencyContactName: "Steve Baker", emergencyContactPhone: "416-555-2126" },
  { id: "prodmem_27", firstName: "Dylan", lastName: "Morris", email: "dylan.morris27@example.test", phone: "647-555-0127", emergencyContactName: "Karen Morris", emergencyContactPhone: "647-555-2127" },
  { id: "prodmem_28", firstName: "Lucy", lastName: "Campbell", email: "lucy.campbell28@example.test", phone: "905-555-0128", emergencyContactName: "Andrew Campbell", emergencyContactPhone: "905-555-2128" },
  { id: "prodmem_29", firstName: "Aaron", lastName: "Stewart", email: "aaron.stewart29@example.test", phone: "289-555-0129", emergencyContactName: "Marie Stewart", emergencyContactPhone: "289-555-2129" },
  { id: "prodmem_30", firstName: "Madison", lastName: "Bell", email: "madison.bell30@example.test", phone: "437-555-0130", emergencyContactName: "Frank Bell", emergencyContactPhone: "437-555-2130" },
  { id: "prodmem_31", firstName: "Christopher", lastName: "Kelly", email: "christopher.kelly31@example.test", phone: "416-555-0131", emergencyContactName: "Susan Kelly", emergencyContactPhone: "416-555-2131" },
  { id: "prodmem_32", firstName: "Claire", lastName: "Murphy", email: "claire.murphy32@example.test", phone: "647-555-0132", emergencyContactName: "Patrick Murphy", emergencyContactPhone: "647-555-2132" },
  { id: "prodmem_33", firstName: "Tyler", lastName: "Adams", email: "tyler.adams33@example.test", phone: "905-555-0133", emergencyContactName: "Linda Adams", emergencyContactPhone: "905-555-2133" },
  { id: "prodmem_34", firstName: "Rebecca", lastName: "Hall", email: "rebecca.hall34@example.test", phone: "289-555-0134", emergencyContactName: "Michael Hall", emergencyContactPhone: "289-555-2134" },
  { id: "prodmem_35", firstName: "Jonathan", lastName: "Wright", email: "jonathan.wright35@example.test", phone: "437-555-0135", emergencyContactName: "Sandra Wright", emergencyContactPhone: "437-555-2135" },
  { id: "prodmem_36", firstName: "Lauren", lastName: "King", email: "lauren.king36@example.test", phone: "416-555-0136", emergencyContactName: "Robert King", emergencyContactPhone: "416-555-2136" },
] as const;

type Attendance = { memberIndex: number; walkIn?: boolean; noShow?: boolean };

const EVENTS = [
  {
    id: "prodevt_career_ready_20260809",
    title: "Career Ready: Resume and Interview Mastery",
    description:
      "A practical career-development session focused on building stronger resumes, preparing for behavioural interviews, communicating professional experience clearly, and improving confidence throughout the hiring process.",
    speakerName: "Rachel Morgan",
    speakerTitle: "Senior Talent Acquisition Partner",
    speakerOrganization: "RBC",
    eventDate: new Date(Date.UTC(2026, 7, 9)),
    registrationDeadline: new Date("2026-08-07T10:00:00.000Z"),
    checkInOpensAt: new Date("2026-08-09T08:30:00.000Z"),
    attendance: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 21, 22,
    ].map((memberIndex): Attendance => ({
      memberIndex,
      walkIn: memberIndex === 14 || memberIndex === 15,
      noShow: memberIndex === 16 || memberIndex === 21 || memberIndex === 22,
    })),
  },
  {
    id: "prodevt_money_matters_20260816",
    title: "Money Matters: Personal Finance for Young Professionals",
    description:
      "A practical introduction to budgeting, credit, emergency funds, investing basics, financial planning, and smart money habits for young professionals living in Canada.",
    speakerName: "Daniel Foster",
    speakerTitle: "Financial Education Specialist",
    speakerOrganization: "TD Bank",
    eventDate: new Date(Date.UTC(2026, 7, 16)),
    registrationDeadline: new Date("2026-08-14T10:00:00.000Z"),
    checkInOpensAt: new Date("2026-08-16T08:30:00.000Z"),
    attendance: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24,
    ].map((memberIndex): Attendance => ({
      memberIndex,
      walkIn: memberIndex === 17 || memberIndex === 18 || memberIndex === 19,
      noShow: memberIndex === 20 || memberIndex === 23 || memberIndex === 24,
    })),
  },
  {
    id: "prodevt_ai_at_work_20260823",
    title: "AI at Work: Practical Tools for the Modern Workplace",
    description:
      "A practical introduction to artificial intelligence tools for productivity, research, documentation, communication, problem solving, and professional development, including responsible AI use.",
    speakerName: "Sophia Chen",
    speakerTitle: "AI Solutions Consultant",
    speakerOrganization: "Microsoft Canada",
    eventDate: new Date(Date.UTC(2026, 7, 23)),
    registrationDeadline: new Date("2026-08-21T10:00:00.000Z"),
    checkInOpensAt: new Date("2026-08-23T08:30:00.000Z"),
    attendance: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 17, 18, 19, 20, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
    ].map((memberIndex): Attendance => ({
      memberIndex,
      walkIn: memberIndex === 25 || memberIndex === 26 || memberIndex === 27 || memberIndex === 28,
      noShow: memberIndex === 34 || memberIndex === 35 || memberIndex === 36,
    })),
  },
];

async function main() {
  const upcoming = await prisma.event.findFirst({
    where: { title: UPCOMING_TITLE },
    select: { id: true, title: true, status: true },
  });
  const coordinator = await prisma.user.findFirst({
    where: { role: "COORDINATOR", active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });

  const memberIds: string[] = [];
  for (const row of MEMBERS) {
    const member = await prisma.member.upsert({
      where: { email: row.email },
      create: {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        emergencyContactName: row.emergencyContactName,
        emergencyContactPhone: row.emergencyContactPhone,
        active: true,
      },
      update: {
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        emergencyContactName: row.emergencyContactName,
        emergencyContactPhone: row.emergencyContactPhone,
        active: true,
      },
    });
    memberIds.push(member.id);
  }

  for (const spec of EVENTS) {
    if (spec.title === UPCOMING_TITLE) {
      throw new Error("Refusing to write the upcoming Mastering AI event.");
    }
    const existing = await prisma.event.findUnique({ where: { id: spec.id } });
    if (existing?.title === UPCOMING_TITLE) {
      console.warn(`Skipping ${spec.id}; it matches the upcoming event.`);
      continue;
    }
    const data = {
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
      createdById: existing?.createdById ?? coordinator?.id ?? null,
    };
    await prisma.event.upsert({
      where: { id: spec.id },
      create: { id: spec.id, ...data },
      update: data,
    });

    let checkedIn = 0;
    let noShows = 0;
    let walkIns = 0;
    for (const [order, row] of spec.attendance.entries()) {
      const memberId = memberIds[row.memberIndex - 1];
      const isCheckedIn = !row.noShow;
      const isWalkIn = Boolean(row.walkIn && isCheckedIn);
      if (isCheckedIn) checkedIn += 1;
      else noShows += 1;
      if (isWalkIn) walkIns += 1;
      const checkedInAt = isCheckedIn
        ? new Date(spec.checkInOpensAt.getTime() + (20 + order) * 60 * 1000)
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
          checkedInById: isCheckedIn ? coordinator?.id ?? null : null,
        },
        update: {
          type: isWalkIn ? "WALK_IN" : "STANDARD",
          status: "REGISTERED",
          checkInStatus: isCheckedIn ? "CHECKED_IN" : "NO_SHOW",
          checkedInAt,
          checkedInById: isCheckedIn ? coordinator?.id ?? null : null,
          cancelledAt: null,
        },
      });
    }
    console.log(
      `${spec.title}: ${spec.attendance.length} registered, ${checkedIn} checked in, ${noShows} no shows, ${walkIns} walk-ins`,
    );
  }

  console.log(`Upserted ${MEMBERS.length} fictional members (@example.test).`);
  console.log("No tables were deleted. CoordinatorAllowlist was not changed.");
  if (upcoming) console.log(`Left upcoming event unchanged: ${upcoming.title} (${upcoming.id})`);
  if (coordinator) console.log(`Historical check-ins attributed to ${coordinator.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
