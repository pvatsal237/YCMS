DO $$ BEGIN CREATE TYPE "DepartmentPlanStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CHANGES_REQUESTED', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "EventDepartmentPlan" (
  "id" TEXT NOT NULL,
  "meetupId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "status" "DepartmentPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "cuisine" TEXT,
  "sponsorName" TEXT,
  "preparationLocation" TEXT,
  "kitchenNotes" TEXT,
  "reviewNote" TEXT,
  "knownAssignments" JSONB,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventDepartmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventDepartmentPlan_meetupId_departmentId_key" ON "EventDepartmentPlan"("meetupId", "departmentId");
CREATE INDEX IF NOT EXISTS "EventDepartmentPlan_status_meetupId_idx" ON "EventDepartmentPlan"("status", "meetupId");

ALTER TABLE "VolunteerStaffingRequest" ADD COLUMN IF NOT EXISTS "planId" TEXT;
ALTER TABLE "VolunteerStaffingRequest" ADD COLUMN IF NOT EXISTS "preAssignedUserId" TEXT;

DO $$ BEGIN
  ALTER TABLE "EventDepartmentPlan" ADD CONSTRAINT "EventDepartmentPlan_meetupId_fkey" FOREIGN KEY ("meetupId") REFERENCES "Meetup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "EventDepartmentPlan" ADD CONSTRAINT "EventDepartmentPlan_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "VolunteerDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "EventDepartmentPlan" ADD CONSTRAINT "EventDepartmentPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "EventDepartmentPlan" ADD CONSTRAINT "EventDepartmentPlan_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "VolunteerStaffingRequest" ADD CONSTRAINT "VolunteerStaffingRequest_planId_fkey" FOREIGN KEY ("planId") REFERENCES "EventDepartmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "VolunteerStaffingRequest" ADD CONSTRAINT "VolunteerStaffingRequest_preAssignedUserId_fkey" FOREIGN KEY ("preAssignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
