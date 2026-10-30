-- AlterTable
ALTER TABLE "Practice" ADD COLUMN "demoExpiresAt" TIMESTAMP(3),
ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Practice_isDemo_demoExpiresAt_idx" ON "Practice"("isDemo", "demoExpiresAt");
