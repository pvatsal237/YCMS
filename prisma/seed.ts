import { prisma } from "@/lib/prisma";
import { defaultCheckInOpensAt, defaultDeadline } from "@/services/events";

const COORDINATORS = [
  { name: "Priya Sharma", email: "priya.sharma@iycm.local" },
  { name: "James Okonkwo", email: "james.okonkwo@iycm.local" },
  { name: "Sofia Alvarez", email: "sofia.alvarez@iycm.local" },
  { name: "Daniel Chen", email: "daniel.chen@iycm.local" },
  { name: "Amina Hassan", email: "amina.hassan@iycm.local" },
  { name: "Lucas Ferreira", email: "lucas.ferreira@iycm.local" },
  { name: "Hana Kim", email: "hana.kim@iycm.local" },
  { name: "Omar Rahman", email: "omar.rahman@iycm.local" },
  { name: "Elena Petrov", email: "elena.petrov@iycm.local" },
  { name: "Noah Williams", email: "noah.williams@iycm.local" },
];

async function main() {
  await prisma.guidanceMessage.deleteMany();
  await prisma.guidanceRequest.deleteMany();
  await prisma.eventFeedback.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.emailOtp.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
  await prisma.member.deleteMany();
  await prisma.coordinatorAllowlist.deleteMany();

  for (const row of COORDINATORS) {
    await prisma.coordinatorAllowlist.create({ data: row });
    await prisma.user.create({
      data: { name: row.name, email: row.email, role: "COORDINATOR", active: true },
    });
  }

  const members = [
    { firstName: "Maya", lastName: "Patel", email: "maya.patel@example.test", phone: "4165553487" },
    { firstName: "Arjun", lastName: "Shah", email: "arjun.shah@example.test", phone: "6475552211" },
    { firstName: "Lila", lastName: "Nguyen", email: "lila.nguyen@example.test", phone: "4165559090" },
  ];
  const createdMembers = [];
  for (const row of members) {
    const member = await prisma.member.create({ data: { ...row, active: true } });
    await prisma.user.create({
      data: {
        name: `${row.firstName} ${row.lastName}`,
        email: row.email,
        role: "MEMBER",
        active: true,
        memberId: member.id,
      },
    });
    createdMembers.push(member);
  }

  const coordinator = await prisma.user.findUnique({ where: { email: COORDINATORS[0].email } });
  const nextSunday = new Date();
  nextSunday.setUTCDate(nextSunday.getUTCDate() + ((7 - nextSunday.getUTCDay()) % 7 || 7));
  const eventDate = new Date(Date.UTC(nextSunday.getUTCFullYear(), nextSunday.getUTCMonth(), nextSunday.getUTCDate()));

  await prisma.event.create({
    data: {
      title: "Career Development Sunday Meetup",
      description: "Resume review, interview practice, and a short talk on internships in Canada.",
      speakerName: "Riya Kapoor",
      speakerTitle: "Career Coach",
      speakerOrganization: "Pathways Studio",
      eventDate,
      startTime: "10:00",
      endTime: "12:00",
      location: "Community Hall A",
      capacity: 40,
      walkInCapacity: 10,
      registrationDeadline: defaultDeadline(eventDate, "10:00"),
      checkInOpensAt: defaultCheckInOpensAt(eventDate),
      status: "PUBLISHED",
      createdById: coordinator?.id,
    },
  });

  console.log("IYCM seed complete. Coordinators sign in with OTP using @iycm.local emails.");
  console.log("Members: maya.patel@example.test, arjun.shah@example.test, lila.nguyen@example.test");
  console.log("Set DEV_SHOW_OTP=true locally to see the code on the login page.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
