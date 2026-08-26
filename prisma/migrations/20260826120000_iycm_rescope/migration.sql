-- IYCM rescope: drop YCMS volunteer/admin/attendance models and create the simpler event/guidance schema.

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
DROP TABLE IF EXISTS "StaffNotification" CASCADE;
DROP TABLE IF EXISTS "MemberProfileChangeRequest" CASCADE;
DROP TABLE IF EXISTS "FollowUpAttempt" CASCADE;
DROP TABLE IF EXISTS "FollowUp" CASCADE;
DROP TABLE IF EXISTS "Attendance" CASCADE;
DROP TABLE IF EXISTS "AccommodationNeed" CASCADE;
DROP TABLE IF EXISTS "Employment" CASCADE;
DROP TABLE IF EXISTS "ImmigrationDocument" CASCADE;
DROP TABLE IF EXISTS "MemberImmigrationStatus" CASCADE;
DROP TABLE IF EXISTS "Education" CASCADE;
DROP TABLE IF EXISTS "EmergencyContact" CASCADE;
DROP TABLE IF EXISTS "Address" CASCADE;
DROP TABLE IF EXISTS "ActivityLog" CASCADE;
DROP TABLE IF EXISTS "Meetup" CASCADE;
DROP TABLE IF EXISTS "EmailOtp" CASCADE;
DROP TABLE IF EXISTS "SystemSetting" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Member" CASCADE;

DROP TYPE IF EXISTS "VolunteerInterestKind";
DROP TYPE IF EXISTS "VolunteerEnrollmentStatus";
DROP TYPE IF EXISTS "RideRequestStatus";
DROP TYPE IF EXISTS "VolunteerResponseStatus";
DROP TYPE IF EXISTS "DepartmentPlanStatus";
DROP TYPE IF EXISTS "StaffingRequestStatus";
DROP TYPE IF EXISTS "VolunteerDeptRole";
DROP TYPE IF EXISTS "VolunteerDepartmentCode";
DROP TYPE IF EXISTS "EventType";
DROP TYPE IF EXISTS "AssistanceStatus";
DROP TYPE IF EXISTS "AssistancePriority";
DROP TYPE IF EXISTS "AssistanceCategory";
DROP TYPE IF EXISTS "FollowUpOutcome";
DROP TYPE IF EXISTS "FollowUpStatus";
DROP TYPE IF EXISTS "AttendanceStatus";
DROP TYPE IF EXISTS "EmploymentStatus";
DROP TYPE IF EXISTS "ImmigrationDocumentType";
DROP TYPE IF EXISTS "ImmigrationStatus";
DROP TYPE IF EXISTS "AddressType";
DROP TYPE IF EXISTS "Gender";
DROP TYPE IF EXISTS "UserRole";

CREATE TYPE "UserRole" AS ENUM ('COORDINATOR', 'MEMBER');
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REGISTRATION_CLOSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'WAITLISTED', 'CANCELLED');
CREATE TYPE "RegistrationType" AS ENUM ('STANDARD', 'WALK_IN');
CREATE TYPE "CheckInStatus" AS ENUM ('REGISTERED', 'CHECKED_IN', 'NO_SHOW');
CREATE TYPE "GuidanceCategory" AS ENUM ('IMMIGRATION', 'CAREER_DEVELOPMENT', 'RESUME_INTERVIEW', 'TECHNOLOGY_IT', 'AI', 'FINANCE', 'ENGINEERING', 'EDUCATION', 'ENTREPRENEURSHIP', 'OTHER');
CREATE TYPE "GuidanceStatus" AS ENUM ('NEW', 'CLAIMED', 'WAITING_FOR_MEMBER', 'RESOLVED');

CREATE TABLE "Member" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "emergencyContactName" TEXT,
  "emergencyContactPhone" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");
CREATE INDEX "Member_lastName_firstName_idx" ON "Member"("lastName", "firstName");
CREATE INDEX "Member_active_idx" ON "Member"("active");

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "memberId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_memberId_key" ON "User"("memberId");
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");
ALTER TABLE "User" ADD CONSTRAINT "User_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CoordinatorAllowlist" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoordinatorAllowlist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoordinatorAllowlist_email_key" ON "CoordinatorAllowlist"("email");

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
  "walkInCapacity" INTEGER NOT NULL DEFAULT 10,
  "registrationDeadline" TIMESTAMP(3) NOT NULL,
  "checkInOpensAt" TIMESTAMP(3) NOT NULL,
  "internalNotes" TEXT,
  "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Event_status_eventDate_idx" ON "Event"("status", "eventDate");
CREATE INDEX "Event_eventDate_idx" ON "Event"("eventDate");
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EventRegistration" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "userId" TEXT,
  "type" "RegistrationType" NOT NULL DEFAULT 'STANDARD',
  "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
  "waitlistPosition" INTEGER,
  "checkInStatus" "CheckInStatus" NOT NULL DEFAULT 'REGISTERED',
  "checkedInAt" TIMESTAMP(3),
  "checkedInById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "promotedAt" TIMESTAMP(3),
  CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventRegistration_eventId_memberId_key" ON "EventRegistration"("eventId", "memberId");
CREATE INDEX "EventRegistration_eventId_status_idx" ON "EventRegistration"("eventId", "status");
CREATE INDEX "EventRegistration_memberId_status_idx" ON "EventRegistration"("memberId", "status");
CREATE INDEX "EventRegistration_eventId_waitlistPosition_idx" ON "EventRegistration"("eventId", "waitlistPosition");
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EventFeedback" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "userId" TEXT,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventFeedback_eventId_memberId_key" ON "EventFeedback"("eventId", "memberId");
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "GuidanceRequest" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "category" "GuidanceCategory" NOT NULL,
  "customTopic" TEXT,
  "message" TEXT NOT NULL,
  "status" "GuidanceStatus" NOT NULL DEFAULT 'NEW',
  "claimedById" TEXT,
  "claimedAt" TIMESTAMP(3),
  "eventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "GuidanceRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuidanceRequest_status_createdAt_idx" ON "GuidanceRequest"("status", "createdAt");
CREATE INDEX "GuidanceRequest_claimedById_status_idx" ON "GuidanceRequest"("claimedById", "status");
CREATE INDEX "GuidanceRequest_memberId_createdAt_idx" ON "GuidanceRequest"("memberId", "createdAt");
CREATE INDEX "GuidanceRequest_category_status_idx" ON "GuidanceRequest"("category", "status");
ALTER TABLE "GuidanceRequest" ADD CONSTRAINT "GuidanceRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuidanceRequest" ADD CONSTRAINT "GuidanceRequest_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GuidanceRequest" ADD CONSTRAINT "GuidanceRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "GuidanceMessage" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuidanceMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuidanceMessage_requestId_createdAt_idx" ON "GuidanceMessage"("requestId", "createdAt");
ALTER TABLE "GuidanceMessage" ADD CONSTRAINT "GuidanceMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "GuidanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuidanceMessage" ADD CONSTRAINT "GuidanceMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "href" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EmailOtp" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,
  CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailOtp_email_createdAt_idx" ON "EmailOtp"("email", "createdAt");
CREATE INDEX "EmailOtp_email_consumedAt_idx" ON "EmailOtp"("email", "consumedAt");
ALTER TABLE "EmailOtp" ADD CONSTRAINT "EmailOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
