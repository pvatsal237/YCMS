import { PrismaClient, type AttendanceStatus, type ImmigrationStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { THREE_CONSECUTIVE_ABSENCE_REASON } from "../src/lib/constants";

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

async function main() {
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
    data: {
      name: "Amina Okonkwo",
      email: "admin@ycms.local",
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  const coordinator = await prisma.user.create({
    data: {
      name: "Daniel Chen",
      email: "coordinator@ycms.local",
      passwordHash,
      role: "COORDINATOR",
      active: true,
      createdById: admin.id,
    },
  });

  await prisma.user.create({
    data: {
      name: "Sofia Alvarez",
      email: "volunteer@ycms.local",
      passwordHash,
      role: "ATTENDANCE_VOLUNTEER",
      active: true,
      createdById: coordinator.id,
    },
  });

  await prisma.systemSetting.createMany({
    data: [
      { key: "organizationName", value: "Youth Community Management System" },
      { key: "defaultMeetupLocation", value: "Riverside Community Centre" },
    ],
  });

  type SeedMember = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    gender: "FEMALE" | "MALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY";
    status: ImmigrationStatus;
    college?: string;
    program?: string;
    employer?: string;
    jobTitle?: string;
    expiryOffsetDays: number;
    passportOffsetDays: number;
    city: string;
    homeCity: string;
    homeProvince: string;
    homeAddressLine1: string;
    emergencyName: string;
    referredBy?: string;
    lookingHousing?: boolean;
    active?: boolean;
    joined: Date;
    absencePattern?: AttendanceStatus[];
  };

  const members: SeedMember[] = [
    { firstName: "Hetvi", lastName: "Patel", email: "hetvi.patel@example.test", phone: "416-555-0101", gender: "FEMALE", status: "STUDENT", college: "University of Toronto", program: "Computer Science", expiryOffsetDays: 45, passportOffsetDays: 800, city: "Toronto", homeCity: "Mumbai", homeProvince: "Maharashtra", homeAddressLine1: "14 Gujarati Society, Ghatkopar East", emergencyName: "Mahesh Patel", referredBy: "Jayesh Patel", joined: utcDate(2026, 1, 12), absencePattern: ["ABSENT", "ABSENT", "ABSENT", "PRESENT", "PRESENT", "EXCUSED"] },
    { firstName: "Nirav", lastName: "Shah", email: "nirav.shah@example.test", phone: "647-555-0102", gender: "MALE", status: "STUDENT", college: "Seneca Polytechnic", program: "Business Analytics", expiryOffsetDays: 20, passportOffsetDays: 400, city: "North York", homeCity: "Mumbai", homeProvince: "Maharashtra", homeAddressLine1: "B-7 Shreeji Apartments, Andheri West", emergencyName: "Bharat Shah", referredBy: "Community outreach", joined: utcDate(2026, 2, 3), absencePattern: ["ABSENT", "ABSENT", "ABSENT", "ABSENT", "PRESENT", "PRESENT"] },
    { firstName: "Krisha", lastName: "Desai", email: "krisha.desai@example.test", phone: "905-555-0103", gender: "FEMALE", status: "WORKER", employer: "Northwind Clinics", jobTitle: "Pharmacy Assistant", expiryOffsetDays: 110, passportOffsetDays: 600, city: "Mississauga", homeCity: "Surat", homeProvince: "Gujarat", homeAddressLine1: "32 Ring Road, Adajan", emergencyName: "Nilesh Desai", referredBy: "Mansi Desai", joined: utcDate(2025, 11, 18), absencePattern: ["ABSENT", "EXCUSED", "ABSENT", "ABSENT", "PRESENT", "PRESENT"] },
    { firstName: "Parth", lastName: "Joshi", email: "parth.joshi@example.test", phone: "416-555-0104", gender: "MALE", status: "STUDENT", college: "York University", program: "Public Health", expiryOffsetDays: 70, passportOffsetDays: 900, city: "Scarborough", homeCity: "Vadodara", homeProvince: "Gujarat", homeAddressLine1: "11 Alkapuri Society", emergencyName: "Sudhir Joshi", referredBy: "Jayesh Patel", joined: utcDate(2026, 3, 9), absencePattern: ["ABSENT", "ABSENT", "ABSENT", "PRESENT", "EXCUSED", "PRESENT"] },
    { firstName: "Avani", lastName: "Mehta", email: "avani.mehta@example.test", phone: "647-555-0105", gender: "FEMALE", status: "PERMANENT_RESIDENT", employer: "City Library", jobTitle: "Library Clerk", expiryOffsetDays: 200, passportOffsetDays: 1200, city: "Markham", homeCity: "Ahmedabad", homeProvince: "Gujarat", homeAddressLine1: "44 CG Road, Navrangpura", emergencyName: "Kiran Mehta", referredBy: "Youth meetup", joined: utcDate(2025, 8, 2), absencePattern: ["PRESENT", "PRESENT", "PRESENT", "EXCUSED", "PRESENT", "PRESENT"] },
    { firstName: "Dhruv", lastName: "Amin", email: "dhruv.amin@example.test", phone: "437-555-0106", gender: "MALE", status: "WORKER", employer: "Maple Logistics", jobTitle: "Warehouse Associate", expiryOffsetDays: 160, passportOffsetDays: 500, city: "Brampton", homeCity: "Rajkot", homeProvince: "Gujarat", homeAddressLine1: "8 Kalavad Road", emergencyName: "Prakash Amin", referredBy: "Hetvi Patel", joined: utcDate(2026, 4, 21) },
    { firstName: "Riddhi", lastName: "Gandhi", email: "riddhi.gandhi@example.test", phone: "416-555-0107", gender: "FEMALE", status: "STUDENT", college: "George Brown College", program: "Nursing", expiryOffsetDays: 300, passportOffsetDays: 700, city: "Toronto", homeCity: "Mumbai", homeProvince: "Maharashtra", homeAddressLine1: "19 Walkeshwar Gujarati Mandal Road", emergencyName: "Sejal Gandhi", referredBy: "Community outreach", joined: utcDate(2026, 5, 14), lookingHousing: true },
    { firstName: "Yash", lastName: "Bhatt", email: "yash.bhatt@example.test", phone: "905-555-0108", gender: "MALE", status: "STUDENT", college: "Humber College", program: "Mechanical Engineering", expiryOffsetDays: -12, passportOffsetDays: 220, city: "Etobicoke", homeCity: "Bhavnagar", homeProvince: "Gujarat", homeAddressLine1: "5 Waghawadi Road", emergencyName: "Hitesh Bhatt", referredBy: "Parth Joshi", joined: utcDate(2025, 9, 30) },
    { firstName: "Mansi", lastName: "Dave", email: "mansi.dave@example.test", phone: "647-555-0109", gender: "FEMALE", status: "VISITOR", expiryOffsetDays: 15, passportOffsetDays: 80, city: "Toronto", homeCity: "Gandhinagar", homeProvince: "Gujarat", homeAddressLine1: "Sector 21, Plot 18", emergencyName: "Alka Dave", referredBy: "Jayesh Patel", joined: utcDate(2026, 7, 1) },
    { firstName: "Kunal", lastName: "Panchal", email: "kunal.panchal@example.test", phone: "416-555-0110", gender: "MALE", status: "WORKER", employer: "Nimbus Software", jobTitle: "QA Analyst", expiryOffsetDays: 500, passportOffsetDays: 1400, city: "Waterloo", homeCity: "Anand", homeProvince: "Gujarat", homeAddressLine1: "12 Vallabh Vidyanagar", emergencyName: "Ramesh Panchal", referredBy: "Youth meetup", joined: utcDate(2025, 6, 11) },
    { firstName: "Diya", lastName: "Soni", email: "diya.soni@example.test", phone: "437-555-0111", gender: "FEMALE", status: "STUDENT", college: "University of Waterloo", program: "Environmental Studies", expiryOffsetDays: 88, passportOffsetDays: 430, city: "Kitchener", homeCity: "Nadiad", homeProvince: "Gujarat", homeAddressLine1: "7 College Road", emergencyName: "Nayana Soni", referredBy: "Avani Mehta", joined: utcDate(2026, 1, 28), lookingHousing: true },
    { firstName: "Harsh", lastName: "Thakkar", email: "harsh.thakkar@example.test", phone: "905-555-0112", gender: "MALE", status: "PERMANENT_RESIDENT", employer: "Greenfield Farms", jobTitle: "Operations Lead", expiryOffsetDays: 40, passportOffsetDays: 1000, city: "Brampton", homeCity: "Jamnagar", homeProvince: "Gujarat", homeAddressLine1: "21 Patel Colony", emergencyName: "Vijay Thakkar", referredBy: "Community outreach", joined: utcDate(2025, 4, 4) },
    { firstName: "Pooja", lastName: "Vyas", email: "pooja.vyas@example.test", phone: "416-555-0113", gender: "FEMALE", status: "CITIZEN", employer: "Harbour Legal", jobTitle: "Paralegal", expiryOffsetDays: 900, passportOffsetDays: 200, city: "Toronto", homeCity: "Junagadh", homeProvince: "Gujarat", homeAddressLine1: "3 Azad Chowk", emergencyName: "Jagruti Vyas", referredBy: "Jayesh Patel", joined: utcDate(2024, 12, 12) },
    { firstName: "Mihir", lastName: "Raval", email: "mihir.raval@example.test", phone: "647-555-0114", gender: "MALE", status: "STUDENT", college: "Toronto Metropolitan University", program: "Media Production", expiryOffsetDays: 250, passportOffsetDays: 650, city: "Toronto", homeCity: "Bharuch", homeProvince: "Gujarat", homeAddressLine1: "16 Station Road", emergencyName: "Dipak Raval", referredBy: "Nirav Shah", joined: utcDate(2026, 6, 8) },
    { firstName: "Isha", lastName: "Chokshi", email: "isha.chokshi@example.test", phone: "905-555-0115", gender: "FEMALE", status: "WORKER", employer: "Summit Retail", jobTitle: "Shift Supervisor", expiryOffsetDays: 5, passportOffsetDays: 90, city: "Mississauga", homeCity: "Navsari", homeProvince: "Gujarat", homeAddressLine1: "9 Lunsikui", emergencyName: "Meena Chokshi", referredBy: "Krisha Desai", joined: utcDate(2026, 2, 17) },
    { firstName: "Chirag", lastName: "Parikh", email: "chirag.parikh@example.test", phone: "416-555-0116", gender: "MALE", status: "STUDENT", college: "Centennial College", program: "Hospitality", expiryOffsetDays: 140, passportOffsetDays: 540, city: "Scarborough", homeCity: "Mehsana", homeProvince: "Gujarat", homeAddressLine1: "4 Highway Road", emergencyName: "Sanjay Parikh", referredBy: "Youth meetup", joined: utcDate(2025, 10, 22) },
    { firstName: "Bhavya", lastName: "Jani", email: "bhavya.jani@example.test", phone: "647-555-0117", gender: "FEMALE", status: "STUDENT", college: "University of Toronto", program: "Biology", expiryOffsetDays: 365, passportOffsetDays: 800, city: "Toronto", homeCity: "Bhuj", homeProvince: "Gujarat", homeAddressLine1: "18 Hospital Road, Kutch", emergencyName: "Kailash Jani", referredBy: "Community outreach", joined: utcDate(2026, 8, 2), lookingHousing: true },
    { firstName: "Sagar", lastName: "Gohil", email: "sagar.gohil@example.test", phone: "437-555-0118", gender: "MALE", status: "OTHER", expiryOffsetDays: 60, passportOffsetDays: 300, city: "Hamilton", homeCity: "Porbandar", homeProvince: "Gujarat", homeAddressLine1: "2 Chowpatty Road", emergencyName: "Rakesh Gohil", referredBy: "Jayesh Patel", joined: utcDate(2026, 3, 19) },
    { firstName: "Twinkle", lastName: "Modi", email: "twinkle.modi@example.test", phone: "416-555-0119", gender: "FEMALE", status: "WORKER", employer: "Lakeside Cafe", jobTitle: "Barista", expiryOffsetDays: 175, passportOffsetDays: 410, city: "Toronto", homeCity: "Morbi", homeProvince: "Gujarat", homeAddressLine1: "6 Ceramic Nagar", emergencyName: "Paresh Modi", referredBy: "Avani Mehta", joined: utcDate(2025, 7, 7) },
    { firstName: "Meet", lastName: "Shah", email: "meet.shah@example.test", phone: "905-555-0120", gender: "MALE", status: "STUDENT", college: "York University", program: "Finance", expiryOffsetDays: 400, passportOffsetDays: 1100, city: "Richmond Hill", homeCity: "Mumbai", homeProvince: "Maharashtra", homeAddressLine1: "11 Malad Gujarati Society", emergencyName: "Amit Shah", referredBy: "Nirav Shah", joined: utcDate(2026, 4, 5) },
    { firstName: "Kinal", lastName: "Patel", email: "kinal.patel@example.test", phone: "647-555-0121", gender: "FEMALE", status: "PERMANENT_RESIDENT", employer: "CarePath Home Support", jobTitle: "Support Worker", expiryOffsetDays: 95, passportOffsetDays: 720, city: "Ottawa", homeCity: "Valsad", homeProvince: "Gujarat", homeAddressLine1: "15 Tithal Road", emergencyName: "Daksha Patel", referredBy: "Community outreach", joined: utcDate(2025, 5, 16) },
    { firstName: "Jignesh", lastName: "Joshi", email: "jignesh.joshi@example.test", phone: "416-555-0122", gender: "MALE", status: "WORKER", employer: "Peak Construction", jobTitle: "Site Assistant", expiryOffsetDays: 30, passportOffsetDays: 150, city: "Vaughan", homeCity: "Godhra", homeProvince: "Gujarat", homeAddressLine1: "8 Railway Station Road", emergencyName: "Kishor Joshi", referredBy: "Parth Joshi", joined: utcDate(2026, 1, 6) },
    { firstName: "Riya", lastName: "Desai", email: "riya.desai@example.test", phone: "905-555-0123", gender: "FEMALE", status: "STUDENT", college: "Seneca Polytechnic", program: "Early Childhood Education", expiryOffsetDays: 210, passportOffsetDays: 560, city: "North York", homeCity: "Palanpur", homeProvince: "Gujarat", homeAddressLine1: "10 Abu Highway", emergencyName: "Bina Desai", referredBy: "Krisha Desai", joined: utcDate(2026, 7, 20), active: false },
    { firstName: "Hitesh", lastName: "Trivedi", email: "hitesh.trivedi@example.test", phone: "437-555-0124", gender: "MALE", status: "CITIZEN", employer: "Riverside High School", jobTitle: "Tutor", expiryOffsetDays: 1500, passportOffsetDays: 50, city: "Toronto", homeCity: "Mumbai", homeProvince: "Maharashtra", homeAddressLine1: "5 Matunga Gujarati Boarding", emergencyName: "Sharda Trivedi", referredBy: "Youth meetup", joined: utcDate(2024, 9, 1) },
    { firstName: "Jahnvi", lastName: "Patel", email: "jahnvi.patel@example.test", phone: "416-555-0125", gender: "FEMALE", status: "VISITOR", expiryOffsetDays: -5, passportOffsetDays: 20, city: "Toronto", homeCity: "Ahmedabad", homeProvince: "Gujarat", homeAddressLine1: "27 Maninagar East", emergencyName: "Komal Patel", referredBy: "Hetvi Patel", joined: utcDate(2026, 8, 4) },
  ];

  const createdMembers = [];
  for (const item of members) {
    const created = await prisma.member.create({
      data: {
        firstName: item.firstName,
        lastName: item.lastName,
        dateOfBirth: utcDate(1998, 4, 12),
        gender: item.gender,
        phone: item.phone,
        email: item.email,
        bloodGroup: "O+",
        referredBy: item.referredBy ?? "Community outreach",
        dateJoined: item.joined,
        active: item.active ?? true,
        createdById: coordinator.id,
        addresses: {
          create: [
            {
              type: "CANADIAN",
              addressLine1: "100 Community Way",
              city: item.city,
              provinceState: "Ontario",
              postalCode: "M5V 2T6",
              country: "Canada",
            },
            {
              type: "HOME_COUNTRY",
              addressLine1: item.homeAddressLine1,
              city: item.homeCity,
              provinceState: item.homeProvince,
              postalCode: "380001",
              country: "India",
            },
          ],
        },
        emergencyContact: {
          create: {
            name: item.emergencyName,
            relationship: "Parent",
            phone: "416-555-0199",
            alternatePhone: "647-555-0198",
          },
        },
        education: item.college
          ? {
              create: {
                country: "Canada",
                institution: item.college,
                program: item.program ?? "General Studies",
                fieldOfStudy: item.program ?? "General",
                startDate: utcDate(2024, 9, 1),
                currentlyStudying: true,
              },
            }
          : undefined,
        immigrationStatus: {
          create: {
            status: item.status,
            college: item.college,
            program: item.program,
            workPermitType: item.status === "WORKER" ? "Employer-specific" : undefined,
          },
        },
        documents: {
          create: [
            ...(item.status === "STUDENT"
              ? [{ documentType: "STUDY_PERMIT" as const, expiryDate: addDays(utcDate(2026, 8, 14), item.expiryOffsetDays) }]
              : []),
            ...(item.status === "WORKER"
              ? [{ documentType: "WORK_PERMIT" as const, expiryDate: addDays(utcDate(2026, 8, 14), item.expiryOffsetDays) }]
              : []),
            ...(item.status === "PERMANENT_RESIDENT"
              ? [{ documentType: "PR_CARD" as const, expiryDate: addDays(utcDate(2026, 8, 14), item.expiryOffsetDays) }]
              : []),
            {
              documentType: "PASSPORT",
              documentNumber: `P${Math.floor(Math.random() * 9000000 + 1000000)}`,
              expiryDate: addDays(utcDate(2026, 8, 14), item.passportOffsetDays),
            },
          ],
        },
        employment: {
          create: {
            employmentStatus: item.employer ? "EMPLOYED" : item.status === "STUDENT" ? "STUDENT" : "OTHER",
            employer: item.employer,
            jobTitle: item.jobTitle,
            fieldRelated: Boolean(item.employer),
            lookingForJob: !item.employer,
            desiredField: item.program ?? "Community work",
          },
        },
        accommodation: {
          create: {
            looking: Boolean(item.lookingHousing),
            preferredLocation: item.lookingHousing ? "Toronto / Mississauga" : undefined,
            budget: item.lookingHousing ? "$900–$1,200" : undefined,
          },
        },
      },
    });
    createdMembers.push({ ...created, absencePattern: item.absencePattern });
    await prisma.user.create({
      data: {
        name: `${created.firstName} ${created.lastName}`,
        email: created.email,
        role: "MEMBER",
        active: created.active,
        memberId: created.id,
      },
    });
  }

  const meetupDates = [
    utcDate(2026, 7, 4),
    utcDate(2026, 7, 11),
    utcDate(2026, 7, 18),
    utcDate(2026, 7, 25),
    utcDate(2026, 8, 1),
    utcDate(2026, 8, 8),
  ];

  const meetups = [];
  for (const [index, date] of meetupDates.entries()) {
    const meetup = await prisma.meetup.create({
      data: {
        meetupDate: date,
        title: `Weekly Youth Meetup #${index + 1}`,
        location: "Riverside Community Centre",
        createdById: coordinator.id,
      },
    });
    meetups.push(meetup);
  }

  const defaultPattern: AttendanceStatus[] = [
    "PRESENT",
    "PRESENT",
    "ABSENT",
    "PRESENT",
    "EXCUSED",
    "PRESENT",
  ];

  for (const member of createdMembers) {
    if (!member.active) continue;
    const pattern = member.absencePattern ?? defaultPattern;
    for (const [index, meetup] of meetups.entries()) {
      // patterns are newest-first in seed data; apply to newest meetup last
      const status = pattern[meetups.length - 1 - index] ?? "PRESENT";
      await prisma.attendance.create({
        data: {
          meetupId: meetup.id,
          memberId: member.id,
          status,
          recordedById: coordinator.id,
        },
      });
    }
  }

  const flagged = createdMembers.filter((member) =>
    ["Hetvi", "Nirav", "Krisha", "Parth"].includes(member.firstName),
  );
  for (const member of flagged) {
    await prisma.followUp.create({
      data: {
        memberId: member.id,
        reason: THREE_CONSECUTIVE_ABSENCE_REASON,
        status: "PENDING",
        assignedToId: member.firstName === "Krisha" ? coordinator.id : null,
        notes: "Automatically seeded for three consecutive absences.",
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      action: "SEED",
      message: "Development seed data loaded",
    },
  });

  console.log("Seed complete.");
  console.log("Demo accounts (development only):");
  console.log("  admin@ycms.local / YcmsDemo123!");
  console.log("  coordinator@ycms.local / YcmsDemo123!");
  console.log("  volunteer@ycms.local / YcmsDemo123!");
  console.log("Member OTP login (no password): hetvi.patel@example.test");
  console.log("Set DEV_SHOW_OTP=true in .env.local to display the code on the login page.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
