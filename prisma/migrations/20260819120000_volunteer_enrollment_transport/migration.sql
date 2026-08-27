DO $$ BEGIN CREATE TYPE "VolunteerEnrollmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "VolunteerInterestKind" AS ENUM ('DEPARTMENT', 'WHEREVER', 'UNSURE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE "RideRequestStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "VolunteerDepartmentMembership" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "VolunteerDepartmentMembership" ADD COLUMN IF NOT EXISTS "isNewVolunteer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VolunteerDepartmentMembership" ADD COLUMN IF NOT EXISTS "canHelpWherever" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VolunteerDepartmentMembership" ADD COLUMN IF NOT EXISTS "oneTime" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "VolunteerEnrollmentRequest" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "volunteerUserId" TEXT,
  "departmentId" TEXT,
  "interestKind" "VolunteerInterestKind" NOT NULL DEFAULT 'DEPARTMENT',
  "availability" "VolunteerResponseStatus" NOT NULL DEFAULT 'AVAILABLE',
  "availableFrom" TEXT,
  "availableUntil" TEXT,
  "notes" TEXT,
  "isNewVolunteer" BOOLEAN NOT NULL DEFAULT false,
  "canHelpWherever" BOOLEAN NOT NULL DEFAULT false,
  "oneTime" BOOLEAN NOT NULL DEFAULT false,
  "status" "VolunteerEnrollmentStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VolunteerEnrollmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VolunteerEnrollmentRequest_status_departmentId_idx" ON "VolunteerEnrollmentRequest"("status", "departmentId");
CREATE INDEX IF NOT EXISTS "VolunteerEnrollmentRequest_memberId_status_idx" ON "VolunteerEnrollmentRequest"("memberId", "status");

DO $$ BEGIN
  ALTER TABLE "VolunteerEnrollmentRequest" ADD CONSTRAINT "VolunteerEnrollmentRequest_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "VolunteerEnrollmentRequest" ADD CONSTRAINT "VolunteerEnrollmentRequest_volunteerUserId_fkey"
    FOREIGN KEY ("volunteerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "VolunteerEnrollmentRequest" ADD CONSTRAINT "VolunteerEnrollmentRequest_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "VolunteerDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "VolunteerEnrollmentRequest" ADD CONSTRAINT "VolunteerEnrollmentRequest_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "TransportEventAvailability" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "meetupId" TEXT NOT NULL,
  "status" "VolunteerResponseStatus" NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "passengerCapacity" INTEGER,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransportEventAvailability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransportEventAvailability_userId_meetupId_key" ON "TransportEventAvailability"("userId", "meetupId");
CREATE INDEX IF NOT EXISTS "TransportEventAvailability_meetupId_status_idx" ON "TransportEventAvailability"("meetupId", "status");

DO $$ BEGIN
  ALTER TABLE "TransportEventAvailability" ADD CONSTRAINT "TransportEventAvailability_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TransportEventAvailability" ADD CONSTRAINT "TransportEventAvailability_meetupId_fkey"
    FOREIGN KEY ("meetupId") REFERENCES "Meetup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
