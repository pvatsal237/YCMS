-- Rescope to International Youth Community Meetup
-- Drop obsolete objects without wiping _prisma_migrations

DROP TABLE IF EXISTS "StaffNotification" CASCADE;
DROP TABLE IF EXISTS "TransportEventAvailability" CASCADE;
DROP TABLE IF EXISTS "VolunteerEnrollmentRequest" CASCADE;
DROP TABLE IF EXISTS "RideRequest" CASCADE;
DROP TABLE IF EXISTS "VolunteerAssignment" CASCADE;
DROP TABLE IF EXISTS "VolunteerStaffingResponse" CASCADE;
DROP TABLE IF EXISTS "VolunteerStaffingRequest" CASCADE;
DROP TABLE IF EXISTS "EventDepartmentPlan" CASCADE;
DROP TABLE IF EXISTS "VolunteerDepartmentMembership" CASCADE;
DROP TABLE IF EXISTS "VolunteerDepartment" CASCADE;
DROP TABLE IF EXISTS "AssistanceRequestUpdate" CASCADE;
DROP TABLE IF EXISTS "AssistanceRequest" CASCADE;
DROP TABLE IF EXISTS "MemberProfileChangeRequest" CASCADE;
DROP TABLE IF EXISTS "EmailOtp" CASCADE;
DROP TABLE IF EXISTS "ActivityLog" CASCADE;
DROP TABLE IF EXISTS "FollowUpAttempt" CASCADE;
DROP TABLE IF EXISTS "FollowUp" CASCADE;
DROP TABLE IF EXISTS "Attendance" CASCADE;
DROP TABLE IF EXISTS "Meetup" CASCADE;
DROP TABLE IF EXISTS "AccommodationNeed" CASCADE;
DROP TABLE IF EXISTS "Employment" CASCADE;
DROP TABLE IF EXISTS "ImmigrationDocument" CASCADE;
DROP TABLE IF EXISTS "MemberImmigrationStatus" CASCADE;
DROP TABLE IF EXISTS "Education" CASCADE;
DROP TABLE IF EXISTS "EmergencyContact" CASCADE;
DROP TABLE IF EXISTS "Address" CASCADE;
DROP TABLE IF EXISTS "SystemSetting" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "GuidanceMessage" CASCADE;
DROP TABLE IF EXISTS "GuidanceRequest" CASCADE;
DROP TABLE IF EXISTS "EventFeedback" CASCADE;
DROP TABLE IF EXISTS "EventCheckIn" CASCADE;
DROP TABLE IF EXISTS "EventRegistration" CASCADE;
DROP TABLE IF EXISTS "Event" CASCADE;
DROP TABLE IF EXISTS "CoordinatorAllowlist" CASCADE;
DROP TABLE IF EXISTS "Member" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "Gender" CASCADE;
DROP TYPE IF EXISTS "AddressType" CASCADE;
DROP TYPE IF EXISTS "ImmigrationStatus" CASCADE;
DROP TYPE IF EXISTS "ImmigrationDocumentType" CASCADE;
DROP TYPE IF EXISTS "EmploymentStatus" CASCADE;
DROP TYPE IF EXISTS "AttendanceStatus" CASCADE;
DROP TYPE IF EXISTS "FollowUpStatus" CASCADE;
DROP TYPE IF EXISTS "FollowUpOutcome" CASCADE;
DROP TYPE IF EXISTS "AssistanceCategory" CASCADE;
DROP TYPE IF EXISTS "AssistancePriority" CASCADE;
DROP TYPE IF EXISTS "AssistanceStatus" CASCADE;
DROP TYPE IF EXISTS "EventType" CASCADE;
DROP TYPE IF EXISTS "VolunteerDepartmentCode" CASCADE;
DROP TYPE IF EXISTS "VolunteerDeptRole" CASCADE;
DROP TYPE IF EXISTS "StaffingRequestStatus" CASCADE;
DROP TYPE IF EXISTS "DepartmentPlanStatus" CASCADE;
DROP TYPE IF EXISTS "VolunteerResponseStatus" CASCADE;
DROP TYPE IF EXISTS "RideRequestStatus" CASCADE;
DROP TYPE IF EXISTS "VolunteerEnrollmentStatus" CASCADE;
DROP TYPE IF EXISTS "VolunteerInterestKind" CASCADE;
DROP TYPE IF EXISTS "EventStatus" CASCADE;
DROP TYPE IF EXISTS "RegistrationType" CASCADE;
DROP TYPE IF EXISTS "RegistrationStatus" CASCADE;
DROP TYPE IF EXISTS "CheckInStatus" CASCADE;
DROP TYPE IF EXISTS "GuidanceCategory" CASCADE;
DROP TYPE IF EXISTS "GuidanceStatus" CASCADE;
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('COORDINATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REGISTRATION_CLOSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('NORMAL', 'WALK_IN');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'WAITLISTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('CHECKED_IN', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "GuidanceCategory" AS ENUM ('IMMIGRATION', 'CAREER_DEVELOPMENT', 'RESUME_INTERVIEW', 'TECHNOLOGY_IT', 'AI', 'FINANCE', 'ENGINEERING', 'EDUCATION', 'ENTREPRENEURSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "GuidanceStatus" AS ENUM ('NEW', 'CLAIMED', 'WAITING_FOR_MEMBER', 'RESOLVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "image" TEXT,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "memberId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoordinatorAllowlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoordinatorAllowlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "image" TEXT,
    "phone" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "emergencyRelation" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "speakerName" TEXT,
    "speakerTitle" TEXT,
    "speakerOrganization" TEXT,
    "eventDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "registrationDeadline" TIMESTAMP(3) NOT NULL,
    "walkInCapacity" INTEGER NOT NULL DEFAULT 10,
    "checkInOpensAt" TEXT NOT NULL DEFAULT '08:00',
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "walkInToken" TEXT NOT NULL,
    "internalNotes" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "RegistrationType" NOT NULL DEFAULT 'NORMAL',
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "waitlistPosition" INTEGER,
    "promotedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCheckIn" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInById" TEXT,
    "status" "CheckInStatus" NOT NULL DEFAULT 'CHECKED_IN',

    CONSTRAINT "EventCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidanceRequest" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "category" "GuidanceCategory" NOT NULL,
    "otherTopic" TEXT,
    "message" TEXT NOT NULL,
    "status" "GuidanceStatus" NOT NULL DEFAULT 'NEW',
    "assignedToId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuidanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidanceMessage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuidanceMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventFeedback" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_memberId_key" ON "User"("memberId");

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CoordinatorAllowlist_email_key" ON "CoordinatorAllowlist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CoordinatorAllowlist_userId_key" ON "CoordinatorAllowlist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- CreateIndex
CREATE INDEX "Member_lastName_firstName_idx" ON "Member"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Member_active_idx" ON "Member"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Event_walkInToken_key" ON "Event"("walkInToken");

-- CreateIndex
CREATE INDEX "Event_status_eventDate_idx" ON "Event"("status", "eventDate");

-- CreateIndex
CREATE INDEX "Event_eventDate_idx" ON "Event"("eventDate");

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_status_idx" ON "EventRegistration"("eventId", "status");

-- CreateIndex
CREATE INDEX "EventRegistration_memberId_status_idx" ON "EventRegistration"("memberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_memberId_key" ON "EventRegistration"("eventId", "memberId");

-- CreateIndex
CREATE INDEX "EventCheckIn_eventId_idx" ON "EventCheckIn"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventCheckIn_eventId_memberId_key" ON "EventCheckIn"("eventId", "memberId");

-- CreateIndex
CREATE INDEX "GuidanceRequest_status_createdAt_idx" ON "GuidanceRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GuidanceRequest_assignedToId_status_idx" ON "GuidanceRequest"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "GuidanceRequest_memberId_createdAt_idx" ON "GuidanceRequest"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "GuidanceMessage_requestId_createdAt_idx" ON "GuidanceMessage"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventFeedback_eventId_memberId_key" ON "EventFeedback"("eventId", "memberId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoordinatorAllowlist" ADD CONSTRAINT "CoordinatorAllowlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCheckIn" ADD CONSTRAINT "EventCheckIn_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCheckIn" ADD CONSTRAINT "EventCheckIn_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCheckIn" ADD CONSTRAINT "EventCheckIn_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidanceRequest" ADD CONSTRAINT "GuidanceRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidanceRequest" ADD CONSTRAINT "GuidanceRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidanceMessage" ADD CONSTRAINT "GuidanceMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "GuidanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidanceMessage" ADD CONSTRAINT "GuidanceMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

