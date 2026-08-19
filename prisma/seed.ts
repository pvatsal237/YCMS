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
  "Harsh", "Dhruv", "Krisha", "Riya", "Meet", "Hetvi", "Devansh", "Mansi", "Parth", "Khushi",
  "Jay", "Nirali", "Karan", "Pooja", "Yash", "Jahnvi", "Tirth", "Disha", "Aryan", "Kavya",
  "Mihir", "Isha", "Vivek", "Nidhi", "Kunal", "Twisha", "Hiten", "Bansari", "Rushi", "Dhwani",
  "Smit", "Foram", "Manan", "Hiral", "Darsh", "Kruti", "Veer", "Jinal", "Om", "Maitri",
  "Shivam", "Diya", "Aayush", "Prisha", "Keyur", "Vrushti", "Neel", "Tanvi", "Jenil", "Yesha",
];
const LAST = [
  "Patel", "Shah", "Mehta", "Desai", "Trivedi", "Bhatt", "Joshi", "Vyas", "Modi", "Dave",
  "Pandya", "Raval", "Thakkar", "Parikh", "Gandhi", "Amin", "Panchal", "Soni", "Jani", "Acharya",
  "Choksi", "Kapadia", "Mistry", "Gajjar", "Buch", "Oza", "Vora", "Rawal", "Upadhyay", "Shukla",
];

async function main() {
  await prisma.volunteerAssignment.deleteMany();
  await prisma.volunteerStaffingResponse.deleteMany();
  await prisma.volunteerStaffingRequest.deleteMany();
  await prisma.eventDepartmentPlan.deleteMany();
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
    data: { name: "Harsh Patel", email: "admin@ycms.local", passwordHash, role: "ADMIN", phone: "416-555-1001", active: true },
  });
  await prisma.user.create({
    data: { name: "Dhruv Shah", email: "admin2@ycms.local", passwordHash, role: "ADMIN", phone: "416-555-1002", active: true },
  });

  const coordinatorNames = [
    "Krisha Mehta", "Riya Desai", "Meet Trivedi", "Devansh Bhatt", "Mansi Joshi", "Parth Vyas",
    "Khushi Modi", "Jay Dave", "Nirali Pandya", "Karan Raval", "Pooja Thakkar", "Yash Parikh",
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
    "Hetvi Patel", "Jenil Shah", "Yesha Mehta", "Tirth Desai", "Disha Trivedi", "Aryan Bhatt",
    "Kavya Joshi", "Mihir Vyas", "Isha Modi", "Vivek Dave", "Nidhi Pandya", "Kunal Raval",
    "Twisha Thakkar", "Hiten Parikh", "Bansari Gandhi", "Rushi Amin", "Dhwani Panchal", "Smit Soni",
    "Foram Jani", "Manan Acharya", "Hiral Choksi", "Darsh Kapadia", "Kruti Mistry", "Veer Gajjar",
    "Jinal Buch", "Om Oza", "Maitri Vora", "Shivam Rawal", "Diya Upadhyay", "Aayush Shukla",
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
    const isLead = index < departments.length;
    await prisma.volunteerDepartmentMembership.create({
      data: {
        userId: volunteer.id,
        departmentId: primary.id,
        responsibility: isLead ? "LEAD" : "VOLUNTEER",
      },
    });
    const kitchenLeadOnSeating =
      isLead && primary.code === "KITCHEN" && secondary.code === "SEATING_SETUP";
    if (secondary.id !== primary.id && !kitchenLeadOnSeating) {
      await prisma.volunteerDepartmentMembership.create({
        data: { userId: volunteer.id, departmentId: secondary.id, responsibility: "VOLUNTEER" },
      });
    }
  }

  const kitchenDept = departments.find((d) => d.code === "KITCHEN");
  if (kitchenDept) {
    await prisma.volunteerDepartment.update({
      where: { id: kitchenDept.id },
      data: { leadUserId: volunteers[0].id },
    });
    await prisma.volunteerDepartmentMembership.updateMany({
      where: { departmentId: kitchenDept.id, userId: { not: volunteers[0].id }, responsibility: "LEAD" },
      data: { responsibility: "VOLUNTEER" },
    });
    await prisma.volunteerDepartmentMembership.upsert({
      where: { userId_departmentId: { userId: volunteers[0].id, departmentId: kitchenDept.id } },
      create: { userId: volunteers[0].id, departmentId: kitchenDept.id, responsibility: "LEAD" },
      update: { responsibility: "LEAD" },
    });
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
    const lastName = i === 0 ? "Patel" : LAST[(i + Math.floor(i / FIRST.length)) % LAST.length];
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
        emergencyContact: { create: { name: `${LAST[(i + 3) % LAST.length]} family`, relationship: "Parent", phone: "416-555-0199" } },
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

  const weeklyCuisines = [
    "Gujarati thali",
    "South Indian vegetarian",
    "Indo-Chinese",
    "Pasta night",
    "Chaat & snacks",
    "Biryani (veg & non-veg)",
    "Mexican bowls",
    "Pizza & salad",
  ];
  const pastDates = [
    utcDate(2026, 7, 10),
    utcDate(2026, 7, 17),
    utcDate(2026, 7, 24),
    utcDate(2026, 7, 31),
    utcDate(2026, 8, 7),
    utcDate(2026, 8, 14),
  ];
  const meetups = [];
  for (const [index, date] of pastDates.entries()) {
    meetups.push(
      await prisma.meetup.create({
        data: {
          meetupDate: date,
          title: `Weekly Youth Meetup #${index + 1}`,
          location: "Riverside Community Centre",
          eventType: "WEEKLY_MEETUP",
          startTime: "20:00",
          endTime: "22:00",
          cuisine: weeklyCuisines[index],
          createdById: coordinator.id,
          expectedAttendance: 160,
        },
      }),
    );
  }
  const upcoming = await prisma.meetup.create({
    data: {
      meetupDate: utcDate(2026, 8, 21),
      title: "Weekly Youth Meetup",
      location: "Riverside Community Centre",
      eventType: "WEEKLY_MEETUP",
      startTime: "20:00",
      endTime: "22:00",
      cuisine: "Punjabi vegetarian",
      createdById: coordinator.id,
      expectedAttendance: 180,
    },
  });
  await prisma.meetup.create({
    data: {
      meetupDate: utcDate(2026, 9, 11),
      title: "Weekly Youth Meetup",
      location: "Riverside Community Centre",
      eventType: "WEEKLY_MEETUP",
      startTime: "20:00",
      endTime: "22:00",
      cuisine: "Mediterranean mezze",
      createdById: coordinator.id,
      expectedAttendance: 175,
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
      speakerName: "Dr. Nirav Patel",
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
  const transport = departments.find((d) => d.code === "TRANSPORTATION")!;
  const setup = departments.find((d) => d.code === "SEATING_SETUP")!;
  const av = departments.find((d) => d.code === "AUDIO_VIDEO")!;

  const kitchenPlan = await prisma.eventDepartmentPlan.create({
    data: {
      meetupId: upcoming.id,
      departmentId: kitchen.id,
      status: "APPROVED",
      cuisine: "Punjabi vegetarian",
      sponsorName: "Mehta Family",
      preparationLocation: "Community kitchen, Unit 4",
      kitchenNotes: "Prep starts mid-afternoon; serving at 8:00 PM.",
      knownAssignments: [
        { label: "Grocery Person", userId: volunteers[8].id },
        { label: "Food Delivery Person", userId: volunteers[16].id },
      ],
      createdById: volunteers[0].id,
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedById: coordinator.id,
    },
  });
  const kitchenTasks = [
    { task: "Chopping", neededCount: 10, requestDate: utcDate(2026, 8, 21), startTime: "15:00", endTime: "17:00", assign: [8, 16, 24, 5] },
    { task: "Groceries", neededCount: 3, requestDate: utcDate(2026, 8, 20), startTime: "18:00", endTime: "20:00", assign: [8, 16, 24] },
    { task: "Cooking / Food Preparation", neededCount: 8, requestDate: utcDate(2026, 8, 21), startTime: "15:00", endTime: "19:00", assign: [0, 13, 21, 29] },
    { task: "Dishes / Cleanup", neededCount: 4, requestDate: utcDate(2026, 8, 21), startTime: "20:30", endTime: "22:00", assign: [8, 16, 24, 5] },
    { task: "Food Delivery to Venue", neededCount: 1, requestDate: utcDate(2026, 8, 21), startTime: "17:30", endTime: "18:15", assign: [16] },
  ];
  for (const task of kitchenTasks) {
    const request = await prisma.volunteerStaffingRequest.create({
      data: {
        meetupId: upcoming.id,
        departmentId: kitchen.id,
        planId: kitchenPlan.id,
        task: task.task,
        neededCount: task.neededCount,
        requestDate: task.requestDate,
        startTime: task.startTime,
        endTime: task.endTime,
        createdById: volunteers[0].id,
        status: "APPROVED",
      },
    });
    for (const index of task.assign) {
      await prisma.volunteerAssignment.create({
        data: { requestId: request.id, userId: volunteers[index].id },
      });
    }
  }

  const transportPlan = await prisma.eventDepartmentPlan.create({
    data: {
      meetupId: upcoming.id,
      departmentId: transport.id,
      status: "APPROVED",
      createdById: volunteers[2].id,
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedById: coordinator.id,
      knownAssignments: [{ label: "Known driver", userId: volunteers[10].id }],
    },
  });
  for (const route of [
    { task: "Markham", neededCount: 3, assign: [10] },
    { task: "Brampton", neededCount: 4, assign: [18, 26] },
    { task: "Mississauga", neededCount: 2, assign: [] },
    { task: "Flexible / General", neededCount: 2, assign: [2] },
  ]) {
    const request = await prisma.volunteerStaffingRequest.create({
      data: {
        meetupId: upcoming.id,
        departmentId: transport.id,
        planId: transportPlan.id,
        task: route.task,
        neededCount: route.neededCount,
        requestDate: utcDate(2026, 8, 21),
        startTime: "18:30",
        endTime: "22:00",
        createdById: volunteers[2].id,
        status: "APPROVED",
      },
    });
    for (const index of route.assign) {
      await prisma.volunteerAssignment.create({
        data: { requestId: request.id, userId: volunteers[index].id },
      });
    }
  }

  const setupPlan = await prisma.eventDepartmentPlan.create({
    data: {
      meetupId: riseup.id,
      departmentId: setup.id,
      status: "PENDING_APPROVAL",
      createdById: volunteers[3].id,
      submittedAt: new Date(),
    },
  });
  await prisma.volunteerStaffingRequest.create({
    data: {
      meetupId: riseup.id,
      departmentId: setup.id,
      planId: setupPlan.id,
      task: "Hall setup",
      neededCount: 4,
      requestDate: utcDate(2026, 9, 20),
      startTime: "15:00",
      endTime: "17:00",
      createdById: volunteers[3].id,
      status: "PENDING_APPROVAL",
    },
  });

  const avPlan = await prisma.eventDepartmentPlan.create({
    data: {
      meetupId: riseup.id,
      departmentId: av.id,
      status: "APPROVED",
      createdById: coordinator.id,
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedById: coordinator.id,
    },
  });
  await prisma.volunteerStaffingRequest.create({
    data: {
      meetupId: riseup.id,
      departmentId: av.id,
      planId: avPlan.id,
      task: "AV support",
      neededCount: 2,
      requestDate: utcDate(2026, 9, 20),
      startTime: "16:00",
      endTime: "20:30",
      createdById: coordinator.id,
      status: "APPROVED",
    },
  });

  await prisma.rideRequest.create({
    data: {
      memberId: createdMembers[0].id,
      meetupId: upcoming.id,
      pickupArea: "Markham",
      availableAfter: "After 6:30 PM",
      passengerCount: 2,
      note: "Near Finch station",
      status: "APPROVED",
    },
  });
  await prisma.rideRequest.create({
    data: {
      memberId: createdMembers[1].id,
      meetupId: upcoming.id,
      pickupArea: "Brampton",
      availableAfter: "After 6:00 PM",
      passengerCount: 1,
      status: "REQUESTED",
    },
  });
  await prisma.rideRequest.create({
    data: {
      memberId: createdMembers[2].id,
      meetupId: upcoming.id,
      pickupArea: "Mississauga",
      availableAfter: "After 7:00 PM",
      passengerCount: 3,
      status: "ASSIGNED",
      driverUserId: volunteers[10].id,
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
