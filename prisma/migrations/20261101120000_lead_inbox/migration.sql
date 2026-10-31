-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "handledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Lead_kind_createdAt_idx" ON "Lead"("kind", "createdAt");
