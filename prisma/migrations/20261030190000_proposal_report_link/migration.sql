-- AlterTable
ALTER TABLE "TreatmentProposal" ADD COLUMN "reportId" TEXT;

-- CreateIndex
CREATE INDEX "TreatmentProposal_reportId_idx" ON "TreatmentProposal"("reportId");

-- AddForeignKey
ALTER TABLE "TreatmentProposal" ADD CONSTRAINT "TreatmentProposal_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
