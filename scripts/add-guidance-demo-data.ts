import { PrismaClient, type GuidanceCategory } from "@prisma/client";

/**
 * Safe historical guidance backfill. INSERT/UPSERT only on demo IDs.
 * Does not delete live requests, send email, or run prisma db seed.
 *
 *   npx tsx scripts/add-guidance-demo-data.ts
 */

const prisma = new PrismaClient();

const EVENT_IDS = {
  career: "prodevt_career_ready_20260809",
  money: "prodevt_money_matters_20260816",
  ai: "prodevt_ai_at_work_20260823",
};

const REQUESTS: Array<{
  id: string;
  email: string;
  category: GuidanceCategory;
  message: string;
  reply: string;
  eventKey: "career" | "money" | "ai" | null;
  createdAt: Date;
  claimedAt: Date;
  resolvedAt: Date;
}> = [
  {
    id: "prodguide_01",
    email: "liam.carter01@example.test",
    category: "IMMIGRATION",
    message: "I recently completed my studies and would like guidance on understanding the next steps related to my work permit options.",
    reply: "We can walk through post-graduation work permit timing, required documents, and how to plan the next steps without missing deadlines.",
    eventKey: "career",
    createdAt: new Date("2026-08-10T15:15:00.000Z"),
    claimedAt: new Date("2026-08-10T16:05:00.000Z"),
    resolvedAt: new Date("2026-08-11T18:30:00.000Z"),
  },
  {
    id: "prodguide_02",
    email: "emma.thompson02@example.test",
    category: "CAREER_DEVELOPMENT",
    message: "I would like advice on moving from customer service into an entry-level business analyst role.",
    reply: "Let's map transferable skills from customer service into analysis work, then identify two or three targeted roles and a short learning plan.",
    eventKey: "money",
    createdAt: new Date("2026-08-11T14:20:00.000Z"),
    claimedAt: new Date("2026-08-11T15:10:00.000Z"),
    resolvedAt: new Date("2026-08-11T20:45:00.000Z"),
  },
  {
    id: "prodguide_03",
    email: "noah.bennett03@example.test",
    category: "RESUME_INTERVIEW",
    message: "I have been applying for jobs but am not getting many interviews. Could someone review how I am presenting my experience?",
    reply: "We can tighten your resume bullets around outcomes and rewrite the summary so hiring managers see your impact more quickly.",
    eventKey: null,
    createdAt: new Date("2026-08-12T13:05:00.000Z"),
    claimedAt: new Date("2026-08-12T13:40:00.000Z"),
    resolvedAt: new Date("2026-08-13T17:15:00.000Z"),
  },
  {
    id: "prodguide_04",
    email: "olivia.parker04@example.test",
    category: "TECHNOLOGY_IT",
    message: "I am interested in Application Support and would like to understand which technical skills I should focus on first.",
    reply: "I'd be happy to help. We can review troubleshooting fundamentals, SQL, APIs, logs, and incident management.",
    eventKey: "career",
    createdAt: new Date("2026-08-13T16:40:00.000Z"),
    claimedAt: new Date("2026-08-13T17:25:00.000Z"),
    resolvedAt: new Date("2026-08-14T19:00:00.000Z"),
  },
  {
    id: "prodguide_05",
    email: "ethan.walker05@example.test",
    category: "FINANCE",
    message: "I would like some basic guidance on budgeting and building an emergency fund while starting my career.",
    reply: "We can set a simple monthly budget, a starter emergency-fund target, and a realistic savings habit around your first paycheck.",
    eventKey: "money",
    createdAt: new Date("2026-08-14T12:10:00.000Z"),
    claimedAt: new Date("2026-08-14T12:55:00.000Z"),
    resolvedAt: new Date("2026-08-16T18:20:00.000Z"),
  },
  {
    id: "prodguide_06",
    email: "sophia.morgan06@example.test",
    category: "EDUCATION",
    message: "I am deciding between a postgraduate certificate and professional certifications and would like some guidance.",
    reply: "We can compare cost, time, and hiring-manager recognition for both paths based on the roles you want next.",
    eventKey: null,
    createdAt: new Date("2026-08-15T15:50:00.000Z"),
    claimedAt: new Date("2026-08-15T16:30:00.000Z"),
    resolvedAt: new Date("2026-08-17T21:05:00.000Z"),
  },
  {
    id: "prodguide_07",
    email: "lucas.anderson07@example.test",
    category: "AI",
    message: "I would like to learn how AI tools can be used responsibly for research, documentation, and productivity.",
    reply: "We can cover practical prompts, source-checking, and when not to use AI for sensitive or regulated work.",
    eventKey: "ai",
    createdAt: new Date("2026-08-17T14:35:00.000Z"),
    claimedAt: new Date("2026-08-17T15:05:00.000Z"),
    resolvedAt: new Date("2026-08-17T19:40:00.000Z"),
  },
  {
    id: "prodguide_08",
    email: "chloe.foster08@example.test",
    category: "IMMIGRATION",
    message: "I would like general guidance on organizing my immigration documents and keeping track of important timelines.",
    reply: "A simple document checklist and calendar reminders for expiry dates will keep the process easier to manage.",
    eventKey: null,
    createdAt: new Date("2026-08-18T13:25:00.000Z"),
    claimedAt: new Date("2026-08-18T14:15:00.000Z"),
    resolvedAt: new Date("2026-08-19T16:50:00.000Z"),
  },
  {
    id: "prodguide_09",
    email: "mason.reed09@example.test",
    category: "ENTREPRENEURSHIP",
    message: "I have an idea for a small technology business and would like guidance on how to validate the idea before investing money.",
    reply: "Start with a small customer interview set and a one-page offer before spending on product or marketing.",
    eventKey: "career",
    createdAt: new Date("2026-08-19T17:00:00.000Z"),
    claimedAt: new Date("2026-08-19T17:45:00.000Z"),
    resolvedAt: new Date("2026-08-21T18:10:00.000Z"),
  },
  {
    id: "prodguide_10",
    email: "emily.collins10@example.test",
    category: "CAREER_DEVELOPMENT",
    message: "I am trying to improve my LinkedIn profile and networking strategy for opportunities in Canada.",
    reply: "We can strengthen your headline, featured section, and a weekly outreach habit that feels natural rather than salesy.",
    eventKey: "money",
    createdAt: new Date("2026-08-20T15:05:00.000Z"),
    claimedAt: new Date("2026-08-20T15:50:00.000Z"),
    resolvedAt: new Date("2026-08-20T20:25:00.000Z"),
  },
  {
    id: "prodguide_11",
    email: "daniel.hughes11@example.test",
    category: "RESUME_INTERVIEW",
    message: "I have an upcoming interview and would like help preparing behavioural examples using the STAR format.",
    reply: "Bring three stories covering teamwork, a problem you solved, and a time you handled pressure, each in STAR format.",
    eventKey: "career",
    createdAt: new Date("2026-08-21T12:40:00.000Z"),
    claimedAt: new Date("2026-08-21T13:20:00.000Z"),
    resolvedAt: new Date("2026-08-22T17:35:00.000Z"),
  },
  {
    id: "prodguide_12",
    email: "grace.mitchell12@example.test",
    category: "TECHNOLOGY_IT",
    message: "I would like guidance on transitioning from help desk support into application support.",
    reply: "Focus on one business application, ticket quality, and learning how incidents move from L1 to L2.",
    eventKey: "ai",
    createdAt: new Date("2026-08-22T16:15:00.000Z"),
    claimedAt: new Date("2026-08-22T16:55:00.000Z"),
    resolvedAt: new Date("2026-08-24T19:05:00.000Z"),
  },
];

async function ensureCoordinatorUsers() {
  const allowlist = await prisma.coordinatorAllowlist.findMany({
    where: { active: true },
    orderBy: { email: "asc" },
  });
  const users = [];
  for (const row of allowlist) {
    const user = await prisma.user.upsert({
      where: { email: row.email },
      create: { name: row.name, email: row.email, role: "COORDINATOR", active: true },
      update: { active: true },
    });
    users.push(user);
  }
  if (users.length === 0) {
    return prisma.user.findMany({ where: { role: "COORDINATOR", active: true }, orderBy: { createdAt: "asc" } });
  }
  return users;
}

async function main() {
  const coordinators = await ensureCoordinatorUsers();
  if (coordinators.length === 0) {
    throw new Error("No coordinator users found. Historical guidance was not created.");
  }
  const pattern = [0, 1, 2, 0, 3, 1, 4, 2, 0, 3, 1, 4];
  let created = 0;
  for (const [index, spec] of REQUESTS.entries()) {
    const member = await prisma.member.findUnique({ where: { email: spec.email } });
    if (!member) {
      console.warn(`Skipping ${spec.id}; member ${spec.email} was not found.`);
      continue;
    }
    const coordinator = coordinators[pattern[index] % coordinators.length];
    const eventId = spec.eventKey ? EVENT_IDS[spec.eventKey] : null;
    const event = eventId ? await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } }) : null;
    await prisma.guidanceRequest.upsert({
      where: { id: spec.id },
      create: {
        id: spec.id,
        memberId: member.id,
        category: spec.category,
        message: spec.message,
        status: "RESOLVED",
        claimedById: coordinator.id,
        claimedAt: spec.claimedAt,
        resolvedAt: spec.resolvedAt,
        eventId: event?.id ?? null,
        createdAt: spec.createdAt,
        updatedAt: spec.resolvedAt,
      },
      update: {
        memberId: member.id,
        category: spec.category,
        message: spec.message,
        status: "RESOLVED",
        claimedById: coordinator.id,
        claimedAt: spec.claimedAt,
        resolvedAt: spec.resolvedAt,
        eventId: event?.id ?? null,
        createdAt: spec.createdAt,
        updatedAt: spec.resolvedAt,
      },
    });
    await prisma.guidanceMessage.upsert({
      where: { id: `${spec.id}_msg_1` },
      create: {
        id: `${spec.id}_msg_1`,
        requestId: spec.id,
        userId: coordinator.id,
        body: spec.reply,
        createdAt: spec.claimedAt,
      },
      update: {
        requestId: spec.id,
        userId: coordinator.id,
        body: spec.reply,
        createdAt: spec.claimedAt,
      },
    });
    created += 1;
    console.log(`${spec.id}: ${spec.email} handled by ${coordinator.name}`);
  }
  console.log(`Upserted ${created} historical RESOLVED guidance requests. No live rows were deleted.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
