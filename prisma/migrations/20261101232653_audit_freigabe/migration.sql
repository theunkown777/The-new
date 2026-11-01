-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "approvedByName" TEXT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_practiceId_createdAt_idx" ON "AuditLog"("practiceId", "createdAt");
