-- CreateEnum
CREATE TYPE "FollowUpOutcome" AS ENUM ('CALLED_SPOKE', 'CALLED_NO_ANSWER', 'CALLED_BUSY_CALLBACK', 'CALLED_IN_HURRY_CALLBACK', 'MESSAGE_SENT', 'WILL_ATTEND', 'COMPLETED', 'UNABLE_TO_REACH');

-- AlterTable
ALTER TABLE "FollowUp" ADD COLUMN     "lastContactedAt" TIMESTAMP(3),
ADD COLUMN     "lastOutcome" "FollowUpOutcome",
ADD COLUMN     "nextFollowUpAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FollowUpAttempt" (
    "id" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "outcome" "FollowUpOutcome" NOT NULL,
    "notes" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUpAttempt_followUpId_createdAt_idx" ON "FollowUpAttempt"("followUpId", "createdAt");

-- CreateIndex
CREATE INDEX "FollowUp_nextFollowUpAt_idx" ON "FollowUp"("nextFollowUpAt");

-- AddForeignKey
ALTER TABLE "FollowUpAttempt" ADD CONSTRAINT "FollowUpAttempt_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpAttempt" ADD CONSTRAINT "FollowUpAttempt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
