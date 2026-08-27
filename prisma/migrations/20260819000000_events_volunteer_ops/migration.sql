-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "EventType" AS ENUM ('WEEKLY_MEETUP', 'RISEUP', 'RECREATION', 'SPECIAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "VolunteerDepartmentCode" AS ENUM ('KITCHEN', 'GROCERIES', 'TRANSPORTATION', 'SEATING_SETUP', 'AUDIO_VIDEO', 'RECREATION', 'RISEUP_SUPPORT', 'GENERAL_EVENT_SUPPORT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "VolunteerDeptRole" AS ENUM ('LEAD', 'VOLUNTEER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "StaffingRequestStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FILLED', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "VolunteerResponseStatus" AS ENUM ('AVAILABLE', 'PARTIAL', 'NOT_AVAILABLE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RideRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'ASSIGNED', 'COMPLETED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Meetup" ADD COLUMN IF NOT EXISTS "eventType" "EventType" NOT NULL DEFAULT 'WEEKLY_MEETUP';
ALTER TABLE "Meetup" ADD COLUMN IF NOT EXISTS "startTime" TEXT;
ALTER TABLE "Meetup" ADD COLUMN IF NOT EXISTS "endTime" TEXT;
ALTER TABLE "Meetup" ADD COLUMN IF NOT EXISTS "topic" TEXT;
ALTER TABLE "Meetup" ADD COLUMN IF NOT EXISTS "speakerName" TEXT;
ALTER TABLE "Meetup" ADD COLUMN IF NOT EXISTS "speakerOrganization" TEXT;
ALTER TABLE "Meetup" ADD COLUMN IF NOT EXISTS "speakerPosition" TEXT;
ALTER TABLE "Meetup" ADD COLUMN IF NOT EXISTS "careerSkillArea" TEXT;
ALTER TABLE "Meetup" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Meetup" ADD COLUMN IF NOT EXISTS "expectedAttendance" INTEGER;
CREATE INDEX IF NOT EXISTS "Meetup_eventType_meetupDate_idx" ON "Meetup"("eventType", "meetupDate");

CREATE TABLE IF NOT EXISTS "VolunteerDepartment" (
  "id" TEXT NOT NULL,
  "code" "VolunteerDepartmentCode" NOT NULL,
  "name" TEXT NOT NULL,
  "leadUserId" TEXT,
  CONSTRAINT "VolunteerDepartment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "VolunteerDepartment_code_key" ON "VolunteerDepartment"("code");
CREATE INDEX IF NOT EXISTS "VolunteerDepartment_leadUserId_idx" ON "VolunteerDepartment"("leadUserId");

CREATE TABLE IF NOT EXISTS "VolunteerDepartmentMembership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "responsibility" "VolunteerDeptRole" NOT NULL DEFAULT 'VOLUNTEER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VolunteerDepartmentMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "VolunteerDepartmentMembership_userId_departmentId_key" ON "VolunteerDepartmentMembership"("userId", "departmentId");

CREATE TABLE IF NOT EXISTS "VolunteerStaffingRequest" (
  "id" TEXT NOT NULL,
  "meetupId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "task" TEXT NOT NULL,
  "neededCount" INTEGER NOT NULL,
  "requestDate" DATE NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "notes" TEXT,
  "createdById" TEXT,
  "status" "StaffingRequestStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VolunteerStaffingRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VolunteerStaffingRequest_status_requestDate_idx" ON "VolunteerStaffingRequest"("status", "requestDate");

CREATE TABLE IF NOT EXISTS "VolunteerStaffingResponse" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "VolunteerResponseStatus" NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VolunteerStaffingResponse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "VolunteerStaffingResponse_requestId_userId_key" ON "VolunteerStaffingResponse"("requestId", "userId");

CREATE TABLE IF NOT EXISTS "VolunteerAssignment" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VolunteerAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "VolunteerAssignment_requestId_userId_key" ON "VolunteerAssignment"("requestId", "userId");

CREATE TABLE IF NOT EXISTS "RideRequest" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "meetupId" TEXT NOT NULL,
  "pickupArea" TEXT NOT NULL,
  "availableAfter" TEXT NOT NULL,
  "passengerCount" INTEGER NOT NULL DEFAULT 1,
  "note" TEXT,
  "status" "RideRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "driverUserId" TEXT,
  "pickupNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RideRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RideRequest_status_meetupId_idx" ON "RideRequest"("status", "meetupId");

DO $$ BEGIN ALTER TABLE "VolunteerDepartment" ADD CONSTRAINT "VolunteerDepartment_leadUserId_fkey" FOREIGN KEY ("leadUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "VolunteerDepartmentMembership" ADD CONSTRAINT "VolunteerDepartmentMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "VolunteerDepartmentMembership" ADD CONSTRAINT "VolunteerDepartmentMembership_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "VolunteerDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "VolunteerStaffingRequest" ADD CONSTRAINT "VolunteerStaffingRequest_meetupId_fkey" FOREIGN KEY ("meetupId") REFERENCES "Meetup"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "VolunteerStaffingRequest" ADD CONSTRAINT "VolunteerStaffingRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "VolunteerDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "VolunteerStaffingRequest" ADD CONSTRAINT "VolunteerStaffingRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "VolunteerStaffingResponse" ADD CONSTRAINT "VolunteerStaffingResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "VolunteerStaffingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "VolunteerStaffingResponse" ADD CONSTRAINT "VolunteerStaffingResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "VolunteerAssignment" ADD CONSTRAINT "VolunteerAssignment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "VolunteerStaffingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "VolunteerAssignment" ADD CONSTRAINT "VolunteerAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_meetupId_fkey" FOREIGN KEY ("meetupId") REFERENCES "Meetup"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
