import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const COORDINATORS = [
  { name: "Piyush Patel", email: "piyush.patel@iycm.demo" },
  { name: "Nisha Shah", email: "nisha.shah@iycm.demo" },
  { name: "Rohan Mehta", email: "rohan.mehta@iycm.demo" },
  { name: "Aisha Khan", email: "aisha.khan@iycm.demo" },
  { name: "Daniel Chen", email: "daniel.chen@iycm.demo" },
  { name: "Sofia Alvarez", email: "sofia.alvarez@iycm.demo" },
  { name: "Priya Sharma", email: "priya.sharma@iycm.demo" },
  { name: "Marcus Johnson", email: "marcus.johnson@iycm.demo" },
  { name: "Leila Haddad", email: "leila.haddad@iycm.demo" },
  { name: "Kenji Tanaka", email: "kenji.tanaka@iycm.demo" },
];

const MEMBERS = [
  ["Hetvi", "Patel", "hetvi.patel@gmail.com", "4165553487"],
  ["Krisha", "Shah", "krisha.shah@gmail.com", "6475552210"],
  ["Aarav", "Sharma", "aarav.sharma@gmail.com", "4375550182"],
  ["Riya", "Desai", "riya.desai@gmail.com", "9055557741"],
  ["Meet", "Trivedi", "meet.trivedi@gmail.com", "2895559033"],
  ["Ananya", "Iyer", "ananya.iyer@gmail.com", "4165556672"],
  ["Omar", "Farouk", "omar.farouk@gmail.com", "6475554419"],
  ["Mei", "Lin", "mei.lin@gmail.com", "4375558820"],
  ["Lucas", "Silva", "lucas.silva@gmail.com", "9055553104"],
  ["Fatima", "Noor", "fatima.noor@gmail.com", "4165551298"],
  ["Jay", "Patel", "jay.patel@gmail.com", "6475557601"],
  ["Sara", "Kim", "sara.kim@gmail.com", "2895554555"],
];

function sundayOffset(weeks: number) {
  const date = new Date();
  const day = date.getDay();
  const add = (day === 0 ? 0 : 7 - day) + weeks * 7;
  date.setDate(date.getDate() + add);
  date.setHours(0, 0, 0, 0);
  return date;
}

function token() {
  return randomBytes(18).toString("hex");
}

async function main() {
  await prisma.notification.deleteMany();
  await prisma.guidanceMessage.deleteMany();
  await prisma.guidanceRequest.deleteMany();
  await prisma.eventFeedback.deleteMany();
  await prisma.eventCheckIn.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.coordinatorAllowlist.deleteMany();
  await prisma.user.deleteMany();
  await prisma.member.deleteMany();

  const coordinatorUsers = [];
  for (const row of COORDINATORS) {
    const user = await prisma.user.create({
      data: { name: row.name, email: row.email, role: "COORDINATOR", active: true },
    });
    await prisma.coordinatorAllowlist.create({
      data: { email: row.email, name: row.name, userId: user.id },
    });
    coordinatorUsers.push(user);
  }

  const members = [];
  for (const [firstName, lastName, email, phone] of MEMBERS) {
    const member = await prisma.member.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        emergencyName: `${firstName}'s emergency contact`,
        emergencyPhone: "4165550000",
        emergencyRelation: "Family",
      },
    });
    await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email,
        role: "MEMBER",
        memberId: member.id,
      },
    });
    members.push(member);
  }

  const career = await prisma.event.create({
    data: {
      title: "Building Your Career in Canada",
      description: "Learn practical strategies for building your career and finding opportunities in Canada.",
      speakerName: "Nisha Shah",
      speakerTitle: "Career Coach",
      speakerOrganization: "IYCM",
      eventDate: sundayOffset(1),
      startTime: "09:00",
      endTime: "12:00",
      location: "Community Hall A",
      capacity: 8,
      registrationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      walkInCapacity: 10,
      status: "PUBLISHED",
      walkInToken: token(),
      createdById: coordinatorUsers[0].id,
      internalNotes: "Registration desk near east entrance. Speaker arriving at 8:30 AM.",
    },
  });

  const immigration = await prisma.event.create({
    data: {
      title: "Immigration Pathways in Canada",
      description: "A practical overview of study, work, and permanent residence pathways.",
      speakerName: "Piyush Patel",
      eventDate: sundayOffset(2),
      startTime: "09:00",
      endTime: "12:00",
      location: "Community Hall B",
      capacity: 60,
      registrationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      walkInCapacity: 10,
      status: "PUBLISHED",
      walkInToken: token(),
      createdById: coordinatorUsers[0].id,
    },
  });

  const past = await prisma.event.create({
    data: {
      title: "AI Mastery",
      description: "Hands-on introduction to practical AI tools for school and work.",
      eventDate: sundayOffset(-2),
      startTime: "09:00",
      endTime: "12:00",
      location: "Lab 2",
      capacity: 40,
      registrationDeadline: sundayOffset(-3),
      walkInCapacity: 10,
      status: "COMPLETED",
      walkInToken: token(),
      createdById: coordinatorUsers[1].id,
    },
  });

  const draft = await prisma.event.create({
    data: {
      title: "Financial Literacy",
      description: "Budgeting, credit, and first jobs in Canada.",
      eventDate: sundayOffset(3),
      startTime: "09:00",
      endTime: "12:00",
      location: "Community Hall A",
      capacity: 50,
      registrationDeadline: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
      walkInCapacity: 10,
      status: "DRAFT",
      walkInToken: token(),
      createdById: coordinatorUsers[2].id,
    },
  });
  void draft;
  void immigration;

  for (let i = 0; i < 8; i += 1) {
    await prisma.eventRegistration.create({
      data: { eventId: career.id, memberId: members[i].id, status: "REGISTERED", type: "NORMAL" },
    });
  }
  await prisma.eventRegistration.create({
    data: { eventId: career.id, memberId: members[8].id, status: "WAITLISTED", waitlistPosition: 1 },
  });
  await prisma.eventRegistration.create({
    data: { eventId: career.id, memberId: members[9].id, status: "WAITLISTED", waitlistPosition: 2 },
  });
  await prisma.eventRegistration.create({
    data: { eventId: career.id, memberId: members[10].id, status: "REGISTERED", type: "WALK_IN" },
  });

  for (let i = 0; i < 6; i += 1) {
    await prisma.eventRegistration.create({
      data: { eventId: past.id, memberId: members[i].id, status: "REGISTERED" },
    });
    await prisma.eventCheckIn.create({
      data: {
        eventId: past.id,
        memberId: members[i].id,
        status: i === 5 ? "NO_SHOW" : "CHECKED_IN",
        checkedInById: coordinatorUsers[0].id,
      },
    });
  }

  const request = await prisma.guidanceRequest.create({
    data: {
      memberId: members[0].id,
      category: "CAREER_DEVELOPMENT",
      message: "I need help preparing for a co-op interview next week.",
      status: "NEW",
    },
  });
  await prisma.guidanceRequest.create({
    data: {
      memberId: members[1].id,
      category: "IMMIGRATION",
      message: "Can someone explain PGWP timelines?",
      status: "CLAIMED",
      assignedToId: coordinatorUsers[0].id,
      claimedAt: new Date(),
    },
  });
  await prisma.guidanceMessage.create({
    data: {
      requestId: request.id,
      authorId: coordinatorUsers[0].id,
      body: "I'm available Tuesday after 6 PM or Thursday between 7–8 PM. Let me know what works for you.",
    },
  });

  console.log("Seed complete.");
  console.log("Coordinator Google allowlist (10):");
  for (const row of COORDINATORS) console.log(`  ${row.name} <${row.email}>`);
  console.log("Seeded members use Gmail-style addresses for database testing.");
  console.log("Real Google Sign-In is required; these seed emails will become coordinator/member accounts only if they match the signed-in Google email.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
