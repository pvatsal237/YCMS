import { prisma } from "@/lib/prisma";

let ensured = false;

async function exec(sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("already exists") ||
      message.includes("duplicate") ||
      message.includes("already present")
    ) {
      return;
    }
    throw error;
  }
}

export async function ensureAssistanceSchema() {
  if (ensured) return;

  await exec(`
    DO $$ BEGIN
      CREATE TYPE "AssistanceCategory" AS ENUM (
        'IMMIGRATION_DOCUMENT',
        'EDUCATION',
        'EMPLOYMENT',
        'ACCOMMODATION',
        'MEETUP',
        'PERSONAL',
        'OTHER'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await exec(`
    DO $$ BEGIN
      CREATE TYPE "AssistancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await exec(`
    DO $$ BEGIN
      CREATE TYPE "AssistanceStatus" AS ENUM (
        'NEW',
        'ASSIGNED',
        'IN_PROGRESS',
        'WAITING_FOR_MEMBER',
        'RESOLVED',
        'CLOSED'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS "AssistanceRequest" (
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
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS "AssistanceRequestUpdate" (
      "id" TEXT NOT NULL,
      "requestId" TEXT NOT NULL,
      "status" "AssistanceStatus",
      "assignedToId" TEXT,
      "internalNote" TEXT,
      "createdById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AssistanceRequestUpdate_pkey" PRIMARY KEY ("id")
    )
  `);
  await exec(
    `CREATE INDEX IF NOT EXISTS "AssistanceRequest_status_createdAt_idx" ON "AssistanceRequest"("status", "createdAt")`,
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "AssistanceRequest_memberId_createdAt_idx" ON "AssistanceRequest"("memberId", "createdAt")`,
  );
  await exec(`
    DO $$ BEGIN
      ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_memberId_fkey"
        FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await exec(`
    DO $$ BEGIN
      ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_documentId_fkey"
        FOREIGN KEY ("documentId") REFERENCES "ImmigrationDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await exec(`
    DO $$ BEGIN
      ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_requestedUserId_fkey"
        FOREIGN KEY ("requestedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await exec(`
    DO $$ BEGIN
      ALTER TABLE "AssistanceRequest" ADD CONSTRAINT "AssistanceRequest_assignedToId_fkey"
        FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await exec(`
    DO $$ BEGIN
      ALTER TABLE "AssistanceRequestUpdate" ADD CONSTRAINT "AssistanceRequestUpdate_requestId_fkey"
        FOREIGN KEY ("requestId") REFERENCES "AssistanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await exec(`
    DO $$ BEGIN
      ALTER TABLE "AssistanceRequestUpdate" ADD CONSTRAINT "AssistanceRequestUpdate_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  ensured = true;
}
