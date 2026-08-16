import { randomUUID } from "node:crypto";
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

export async function ensureMemberAuthSchema() {
  if (ensured) return;

  await exec(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MEMBER'`);
  await prisma.$disconnect();
  await prisma.$connect();
  await exec(`ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL`);
  await exec(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "memberId" TEXT`);
  await exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_memberId_key" ON "User"("memberId")`,
  );
  await exec(`
    DO $$ BEGIN
      ALTER TABLE "User" ADD CONSTRAINT "User_memberId_fkey"
        FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS "EmailOtp" (
      "id" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "codeHash" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "consumedAt" TIMESTAMP(3),
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "userId" TEXT,
      CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
    )
  `);
  await exec(
    `CREATE INDEX IF NOT EXISTS "EmailOtp_email_createdAt_idx" ON "EmailOtp"("email", "createdAt")`,
  );
  await exec(`
    CREATE TABLE IF NOT EXISTS "MemberProfileChangeRequest" (
      "id" TEXT NOT NULL,
      "memberId" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MemberProfileChangeRequest_pkey" PRIMARY KEY ("id")
    )
  `);

  await exec(`
    ALTER TABLE "MemberProfileChangeRequest" ADD COLUMN IF NOT EXISTS "requestType" TEXT NOT NULL DEFAULT 'PROFILE'
  `);
  await exec(`
    ALTER TABLE "MemberProfileChangeRequest" ADD COLUMN IF NOT EXISTS "documentId" TEXT
  `);
  await exec(`
    ALTER TABLE "MemberProfileChangeRequest" ADD COLUMN IF NOT EXISTS "proposedExpiry" DATE
  `);

  ensured = true;
}

export async function countRecentOtps(email: string, since: Date) {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*)::bigint AS n
    FROM "EmailOtp"
    WHERE email = ${email} AND "createdAt" >= ${since}
  `;
  return Number(rows[0]?.n ?? 0);
}

export async function insertOtp(data: {
  email: string;
  codeHash: string;
  userId: string | null;
}) {
  await prisma.$executeRaw`
    INSERT INTO "EmailOtp" (id, email, "codeHash", "expiresAt", attempts, "createdAt", "userId")
    VALUES (${randomUUID()}, ${data.email}, ${data.codeHash}, NOW() + interval '10 minutes', 0, NOW(), ${data.userId})
  `;
}

export async function findLatestOpenOtp(email: string) {
  const rows = await prisma.$queryRaw<
    {
      id: string;
      codeHash: string;
      attempts: number;
    }[]
  >`
    SELECT id, "codeHash", attempts
    FROM "EmailOtp"
    WHERE email = ${email}
      AND "consumedAt" IS NULL
      AND "expiresAt" > NOW()
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { ...row, attempts: Number(row.attempts) };
}

export async function updateOtp(
  id: string,
  data: { attempts: number; consumedAt: Date | null },
) {
  await prisma.$executeRaw`
    UPDATE "EmailOtp"
    SET attempts = ${data.attempts}, "consumedAt" = ${data.consumedAt}
    WHERE id = ${id}
  `;
}

export async function upsertMemberLoginUser(member: {
  id: string;
  name: string;
  email: string;
  active: boolean;
}) {
  const existing = await prisma.$queryRaw<{ id: string; role: string; active: boolean }[]>`
    SELECT id, role::text AS role, active FROM "User" WHERE email = ${member.email} LIMIT 1
  `;
  const row = existing[0];
  if (row) {
    if (row.role !== "MEMBER") {
      return { ...row, blocked: true as const };
    }
    await prisma.$executeRaw`
      UPDATE "User"
      SET name = ${member.name}, active = ${member.active}, "memberId" = ${member.id},
          "passwordHash" = NULL, "updatedAt" = NOW()
      WHERE id = ${row.id}
    `;
    return { id: row.id, active: member.active, blocked: false as const };
  }

  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "User" (id, name, email, role, active, "memberId", "createdAt", "updatedAt")
    VALUES (${id}, ${member.name}, ${member.email}, 'MEMBER'::"UserRole", ${member.active}, ${member.id}, NOW(), NOW())
  `;
  return { id, active: member.active, blocked: false as const };
}

export async function findActiveMemberUser(email: string) {
  const users = await prisma.$queryRaw<
    {
      id: string;
      name: string;
      email: string;
      role: string;
      active: boolean;
      memberId: string | null;
    }[]
  >`
    SELECT id, name, email, role::text AS role, active, "memberId"
    FROM "User"
    WHERE email = ${email} AND active = true
    LIMIT 1
  `;
  const user = users[0];
  if (!user) return null;
  const members = await prisma.member.findFirst({
    where: {
      active: true,
      OR: [{ email }, ...(user.memberId ? [{ id: user.memberId }] : [])],
    },
  });
  if (!members) return null;
  if (user.role !== "MEMBER" && user.role !== "member") return null;
  return { ...user, memberId: user.memberId ?? members.id, member: members };
}
