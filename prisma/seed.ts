import {
  PrismaClient,
  type AttendanceStatus,
  type FollowUpStatus,
  type ImmigrationStatus,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { THREE_CONSECUTIVE_ABSENCE_REASON } from "../src/lib/constants";
import { DEPARTMENT_CODES } from "../src/services/volunteer";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "YcmsDemo123!";

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}
function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

const FIRST = [
  "Aarav", "Anaya", "Dev", "Isha", "Kabir", "Meera", "Rohan", "Sara", "Vihaan", "Zara",
  "Aisha", "Bilal", "Chen", "Diana", "Eli", "Fatima", "Grace", "Hassan", "Ines", "Jamal",
  "Keiko", "Liam", "Maya", "Noah", "Omar", "Priya", "Quinn", "Ravi", "Sofia", "Tara",
];
const LAST = [
  "Patel", "Shah", "Nguyen", "Kim", "Singh", "Chen", "Ali", "Garcia", "Mensah", "Okonkwo",
  "Rahman", "Santos", "Khan", "Lee", "Brown", "Silva", "Ahmed", "Costa", "Park", "Wright",
];

async function main() {
  await prisma.volunteerAssignment.deleteMany();
  await prisma.volunteerStaffingResponse.deleteMany();
  await prisma.volunteerStaffingRequest.deleteMany();
  await prisma.volunteerDepartmentMembership.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.assistanceRequestUpdate.deleteMany();
  await prisma.assistanceRequest.deleteMany();
  await prisma.volunteerDepartment.deleteMany();
  await prisma.emailOtp.deleteMany();
  await prisma.memberProfileChangeRequest.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.immigrationDocument.deleteMany();
  await prisma.memberImmigrationStatus.deleteMany();
  await prisma.education.deleteMany();
  await prisma.address.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.employment.deleteMany();
  await prisma.accommodationNeed.deleteMany();
  await prisma.meetup.deleteMany();
  await prisma.user.deleteMany({ where: { role: "MEMBER" } });
  await prisma.member.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();

  const passwordHash = await hash(DEMO_PASSWORD, 12);

  const admin = await prisma.user.create({
    data: { name: "Amina Okonkwo", email: "admin@ycms.local", passwordHash, role: "ADMIN", phone: "416-555-1001", active: true },
  });
  await prisma.user.create({
    data: { name: "James Whitfield", email: "admin2@ycms.local", passwordHash, role: "ADMIN", phone: "416-555-1002", active: true },
  });

  const coordinatorNames = [
    "Daniel Chen", "Priya Nair", "Omar Haddad", "Elena Rossi", "Kwame Boateng", "Hana Suzuki",
    "Lucas Ferreira", "Nadia Rahman", "Michael Okafor", "Sofia Alvarez", "Arjun Mehta", "Claire Dubois",
  ];
  const coordinators = [];
  for (const [index, name] of coordinatorNames.entries()) {
    coordinators.push(
      await prisma.user.create({
        data: {
          name,
          email: index === 0 ? "coordinator@ycms.local" : `coordinator${index + 1}@ycms.local`,
          passwordHash,
          role: "COORDINATOR",
          phone: `416-555-${1100 + index}`,
          active: true,
          createdById: admin.id,
        },
      }),
    );
  }
  const coordinator = coordinators[0];

  const volunteerNames = [
    "Sofia Alvarez", "Ben Carter", "Maya Kapoor", "Theo Laurent", "Nina Volkov", "Samir Qureshi",
    "Hannah Brooks", "Diego Morales", "Leila Hassan", "Peter Novak", "Amara Diallo", "Chris Young",
    "Yuki Tanaka", "Rosa Marino", "Isaac Cohen", "Nora Berg", "Farid Aziz", "Emily Walsh",
    "Jonas Berg", "Aaliyah Grant", "Kenji Sato", "Marta Silva", "Owen Blake", "Tara Singh",
    "Hugo Martin", "Imani Cole", "Victor Lopez", "Sana Malik", "Paul Nguyen", "Rita Gomes",
  ];
  const volunteers = [];
  for (const [index, name] of volunteerNames.entries()) {
    volunteers.push(
      await prisma.user.create({
        data: {
          name,
          email: index === 0 ? "volunteer@ycms.local" : `volunteer${index + 1}@ycms.local`,
          passwordHash,
          role: "ATTENDANCE_VOLUNTEER",
          phone: `647-555-${2000 + index}`,
          active: true,
          createdById: coordinator.id,
        },
      }),
    );
  }

  const departments = [];
  for (const dept of DEPARTMENT_CODES) {
    departments.push(
      await prisma.volunteerDepartment.create({
        data: { code: dept.code, name: dept.name, leadUserId: volunteers[departments.length % volunteers.length]?.id },
      }),
    );
  }
  for (const [index, volunteer] of volunteers.entries()) {
    const primary = departments[index % departments.length];
    const secondary = departments[(index + 3) % departments.length];
    await prisma.volunteerDepartmentMembership.create({
      data: {
        userId: volunteer.id,
        departmentId: primary.id,
        responsibility: index < departments.length ? "LEAD" : "VOLUNTEER",
      },
    });
    if (secondary.id !== primary.id) {
      await prisma.volunteerDepartmentMembership.create({
        data: { userId: volunteer.id, departmentId: secondary.id, responsibility: "VOLUNTEER" },
      });
    }
  }

  await prisma.systemSetting.createMany({
    data: [
      { key: "organizationName", value: "Youth Community Management System" },
      { key: "defaultMeetupLocation", value: "Riverside Community Centre" },
    ],
  });

  const statuses: ImmigrationStatus[] = ["STUDENT", "WORKER", "PERMANENT_RESIDENT", "CITIZEN", "VISITOR"];
  const createdMembers = [];
  for (let i = 0; i < 180; i++) {
    const firstName = i === 0 ? "Hetvi" : FIRST[i % FIRST.length];
    const lastName = i === 0 ? "Patel" : LAST[Math.floor(i / FIRST.length) % LAST.length];
    const email = i === 0 ? "hetvi.patel@example.test" : `member${i + 1}@example.test`;
    const status = statuses[i % statuses.length];
    const expiryOffsetDays = i % 17 === 0 ? 40 : 200 + (i % 400);
    const created = await prisma.member.create({
      data: {
        firstName,
        lastName,
        dateOfBirth: utcDate(1997 + (i % 8), (i % 12) + 1, (i % 27) + 1),
        gender: i % 2 === 0 ? "FEMALE" : "MALE",
        phone: `416-555-${3000 + i}`,
        email,
        bloodGroup: "O+",
        referredBy: "Youth meetup",
        dateJoined: utcDate(2025, (i % 12) + 1, 10),
        active: i !== 22,
        createdById: coordinator.id,
        addresses: {
          create: [
            { type: "CANADIAN", addressLine1: `${100 + i} Community Way`, city: "Toronto", provinceState: "Ontario", postalCode: "M5V 2T6", country: "Canada" },
            { type: "HOME_COUNTRY", addressLine1: `${i + 1} Home Street`, city: "Ahmedabad", provinceState: "Gujarat", postalCode: "380001", country: "India" },
          ],
        },
        emergencyContact: { create: { name: "Emergency Contact", relationship: "Parent", phone: "416-555-0199" } },
        immigrationStatus: { create: { status, college: status === "STUDENT" ? "University of Toronto" : undefined, program: status === "STUDENT" ? "General Studies" : undefined } },
        documents: {
          create: [
            ...(status === "STUDENT" ? [{ documentType: "STUDY_PERMIT" as const, expiryDate: addDays(utcDate(2026, 8, 19), expiryOffsetDays) }] : []),
            ...(status === "WORKER" ? [{ documentType: "WORK_PERMIT" as const, expiryDate: addDays(utcDate(2026, 8, 19), expiryOffsetDays) }] : []),
            { documentType: "PASSPORT", expiryDate: addDays(utcDate(2026, 8, 19), 800) },
          ],
        },
        employment: { create: { employmentStatus: status === "STUDENT" ? "STUDENT" : "EMPLOYED", lookingForJob: false } },
        accommodation: { create: { looking: i % 20 === 0 } },
      },
    });
    createdMembers.push(created);
    await prisma.user.create({
      data: { name: `${created.firstName} ${created.lastName}`, email: created.email, role: "MEMBER", active: created.active, memberId: created.id },
    });
  }

  const pastDates = [4, 11, 18, 25].flatMap((d) => [utcDate(2026, 6, d), utcDate(2026, 7, d)]).slice(0, 8);
  const meetups = [];
  for (const [index, date] of pastDates.entries()) {
    meetups.push(
      await prisma.meetup.create({
        data: {
          meetupDate: date,
          title: `Weekly Youth Meetup #${index + 1}`,
          location: "Riverside Community Centre",
          eventType: "WEEKLY_MEETUP",
          startTime: "15:00",
          endTime: "18:30",
          createdById: coordinator.id,
          expectedAttendance: 160,
        },
      }),
    );
  }
  const upcoming = await prisma.meetup.create({
    data: {
      meetupDate: utcDate(2026, 9, 12),
      title: "Weekly Youth Meetup",
      location: "Riverside Community Centre",
      eventType: "WEEKLY_MEETUP",
      startTime: "15:00",
      endTime: "18:30",
      createdById: coordinator.id,
      expectedAttendance: 180,
    },
  });
  const riseup = await prisma.meetup.create({
    data: {
      meetupDate: utcDate(2026, 9, 20),
      title: "RiseUp: Artificial Intelligence",
      location: "Riverside Hall",
      eventType: "RISEUP",
      startTime: "17:00",
      endTime: "20:00",
      topic: "Artificial Intelligence",
      speakerName: "Dr. Laila Rahman",
      speakerOrganization: "Northern Tech Institute",
      speakerPosition: "Research Lead",
      careerSkillArea: "Technology",
      description: "Youth development session on AI careers and practical skills.",
      createdById: coordinator.id,
      expectedAttendance: 120,
    },
  });
  await prisma.meetup.create({
    data: {
      meetupDate: utcDate(2026, 9, 27),
      title: "Recreation Afternoon",
      location: "Riverside Gym",
      eventType: "RECREATION",
      startTime: "14:00",
      endTime: "17:00",
      createdById: coordinator.id,
    },
  });

  const activeMembers = createdMembers.filter((m) => m.active);
  for (const [memberIndex, member] of activeMembers.entries()) {
    for (const [index, meetup] of meetups.entries()) {
      let status: AttendanceStatus = "PRESENT";
      if (memberIndex < 8) {
        status = index >= meetups.length - 3 ? "ABSENT" : "PRESENT";
      } else if (memberIndex < 30) {
        status = index === 2 || index === 5 ? "ABSENT" : "PRESENT";
        if (index === 3) status = "EXCUSED";
      } else if (index === memberIndex % meetups.length) {
        status = memberIndex % 9 === 0 ? "EXCUSED" : "PRESENT";
      }
      await prisma.attendance.create({
        data: { meetupId: meetup.id, memberId: member.id, status, recordedById: coordinator.id },
      });
    }
  }

  const serious = activeMembers.slice(0, 8);
  for (const [i, member] of serious.entries()) {
    const status: FollowUpStatus = i < 2 ? "PENDING" : i < 5 ? "CONTACTED" : "COMPLETED";
    await prisma.followUp.create({
      data: {
        memberId: member.id,
        reason: THREE_CONSECUTIVE_ABSENCE_REASON,
        status,
        lastOutcome: status === "COMPLETED" ? "WILL_ATTEND" : status === "CONTACTED" ? "CALLED_BUSY_CALLBACK" : undefined,
        assignedToId: coordinator.id,
        notes: i === 6 ? "Unable to reach on first call; later completed." : "Follow-up after consecutive absences.",
      },
    });
  }
  await prisma.followUp.create({
    data: {
      memberId: activeMembers[10].id,
      reason: THREE_CONSECUTIVE_ABSENCE_REASON,
      status: "UNABLE_TO_REACH",
      lastOutcome: "UNABLE_TO_REACH",
      assignedToId: coordinator.id,
    },
  });

  const kitchen = departments.find((d) => d.code === "KITCHEN")!;
  const groceries = departments.find((d) => d.code === "GROCERIES")!;
  const transport = departments.find((d) => d.code === "TRANSPORTATION")!;
  const setup = departments.find((d) => d.code === "SEATING_SETUP")!;
  const av = departments.find((d) => d.code === "AUDIO_VIDEO")!;

  await prisma.volunteerStaffingRequest.create({
    data: {
      meetupId: upcoming.id,
      departmentId: kitchen.id,
      task: "Food Preparation",
      neededCount: 10,
      requestDate: utcDate(2026, 9, 12),
      startTime: "15:00",
      endTime: "18:30",
      notes: "Pav Bhaji preparation",
      createdById: volunteers[0].id,
      status: "APPROVED",
    },
  });
  await prisma.volunteerStaffingRequest.create({
    data: {
      meetupId: upcoming.id,
      departmentId: groceries.id,
      task: "Grocery run",
      neededCount: 3,
      requestDate: utcDate(2026, 9, 11),
      startTime: "18:00",
      endTime: "20:00",
      createdById: volunteers[1].id,
      status: "APPROVED",
    },
  });
  await prisma.volunteerStaffingRequest.create({
    data: {
      meetupId: riseup.id,
      departmentId: av.id,
      task: "AV support",
      neededCount: 2,
      requestDate: utcDate(2026, 9, 20),
      startTime: "16:00",
      endTime: "20:30",
      createdById: coordinator.id,
      status: "APPROVED",
    },
  });
  await prisma.volunteerStaffingRequest.create({
    data: {
      meetupId: riseup.id,
      departmentId: setup.id,
      task: "Hall setup",
      neededCount: 4,
      requestDate: utcDate(2026, 9, 20),
      startTime: "15:00",
      endTime: "17:00",
      createdById: coordinator.id,
      status: "PENDING_APPROVAL",
    },
  });

  await prisma.rideRequest.create({
    data: {
      memberId: createdMembers[0].id,
      meetupId: upcoming.id,
      pickupArea: "North York / Finch",
      availableAfter: "After 7:00 PM",
      passengerCount: 2,
      note: "Near Finch station",
      status: "APPROVED",
    },
  });

  await prisma.activityLog.create({ data: { userId: admin.id, action: "SEED", message: "Development seed data loaded" } });
  console.log("Seed complete. Demo: admin@ycms.local / coordinator@ycms.local / volunteer@ycms.local / YcmsDemo123!");
  console.log("Member OTP: hetvi.patel@example.test");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
