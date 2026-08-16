-- CreateEnum
CREATE TYPE "AssistanceCategory" AS ENUM (
  'IMMIGRATION_DOCUMENT',
  'EDUCATION',
  'EMPLOYMENT',
  'ACCOMMODATION',
  'MEETUP',
  'PERSONAL',
  'OTHER'
);

CREATE TYPE "AssistancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TYPE "AssistanceStatus" AS ENUM (
  'NEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_FOR_MEMBER',
  'RESOLVED',
  'CLOSED'
);

-- CreateTable
CREATE TABLE "AssistanceRequest" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "category" "AssistanceCategory" NOT NULL,
  "documentId" TEXT,
  "requestedRole" "UserRole" NOT NULL,
  "requestedUserId" TEXT,
  "urgency" "AssistancePriority" NOT NULL,
  "impact" "AssistancePriority" NOT NULL,
  "memberNote" TEXT,
  "preferredResponseBy" DATE,
  "assignedToId" TEXT,
  "status" "AssistanceStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "AssistanceRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssistanceRequestUpdate" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "status" "AssistanceStatus",
  "assignedToId" TEXT,
  "internalNote" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AssistanceRequestUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistanceRequest_status_createdAt_idx" ON "AssistanceRequest"("status", "createdAt");
CREATE INDEX "AssistanceRequest_memberId_createdAt_idx" ON "AssistanceRequest"("memberId", "createdAt");
CREATE INDEX "AssistanceRequest_requestedRole_status_idx" ON "AssistanceRequest"("requestedRole", "status");
CREATE INDEX "AssistanceRequest_assignedToId_status_idx" ON "AssistanceRequest"("assignedToId", "status");
CREATE INDEX "AssistanceRequest_urgency_status_idx" ON "AssistanceRequest"("urgency", "status");
CREATE INDEX "AssistanceRequest_category_status_idx" ON "AssistanceRequest"("category", "status");
CREATE INDEX "AssistanceRequestUpdate_requestId_createdAt_idx" ON "AssistanceRequestUpdate"("requestId", "createdAt");

ALTER TABLE "AssistanceRequest"
  ADD CONSTRAINT "AssistanceRequest_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistanceRequest"
  ADD CONSTRAINT "AssistanceRequest_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "ImmigrationDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssistanceRequest"
  ADD CONSTRAINT "AssistanceRequest_requestedUserId_fkey"
  FOREIGN KEY ("requestedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssistanceRequest"
  ADD CONSTRAINT "AssistanceRequest_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssistanceRequestUpdate"
  ADD CONSTRAINT "AssistanceRequestUpdate_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "AssistanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistanceRequestUpdate"
  ADD CONSTRAINT "AssistanceRequestUpdate_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
